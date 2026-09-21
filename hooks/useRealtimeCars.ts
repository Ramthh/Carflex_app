// hooks/useRealtimeCars.js
"use client";
import { useEffect } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import getValidFirstImage from "@/helpers/getValidFirstImage";
import priceStatus from "@/helpers/priceStatus";

// fetcher function for SWR
const fetcher = async ({ name, limit }: { name: string; limit?: number }) => {
  const res = await fetch(`/api/${name}Cars?limit=${limit || 20}`);
  if (!res.ok) throw new Error('Listing access is unavailable');
  const data = await res.json();
  return data;
};

export default function useRealtimeCars(
  active: string,
  limit = 20,
  initialData: any[],
  managed = false,
) {
  const tableName = active.toLowerCase();

  const { data, error, isLoading, mutate } = useSWR(
    [tableName, limit],
    () => fetcher({ name: tableName, limit }),
    {
      fallbackData: { items: initialData },
      revalidateOnFocus: true,
      refreshInterval: managed ? 5000 : 0,
    },
  );

  useEffect(() => {
    if (!tableName || managed) return;
    const currentMonth = new Date().getMonth() + 1; // 1 = Jan, 4 = Apr
    const year = new Date().getFullYear();
    let newTableName = "";
    if (tableName === "all" || tableName === "marketplace") {
      newTableName = `${tableName}_${tableName === "marketplace" ? "p_" : ""}${year}_${currentMonth.toString().padStart(2, "0")}`;
    }

    // console.log("Setting up real-time listener for", newTableName || tableName);
    const insertSubscription = supabase
      .channel(`realtime-${newTableName || tableName}-insert`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: newTableName || tableName },
        async (payload) => {
          console.log("Change received!");
          const transformedRow = {
            ...payload.new,
            image_src: await getValidFirstImage(payload.new.image_src),
            status: priceStatus(
              payload.new.price,
              payload.new.est_value,
              payload.new.real_value,
            ),
          };
          mutate();
        },
      )
      .subscribe();
    const broadcastSubscription = supabase
      .channel("broadcast-updates")
      .on("broadcast", { event: "is_taken_changed" }, (msg) => {
        const { ad_link, new_is_taken, taken_by, lead_taken } = msg.payload;
        if (lead_taken) {
          mutate(
            (current: any) => ({
              items: current.items.map((r: any) =>
                r.ad_link === ad_link ? { ...r, lead_taken } : r,
              ),
            }),
            false,
          );
        } else {
          // Update SWR cache accordingly
          mutate(
            (current: any) => ({
              items: current.items.map((r: any) =>
                r.ad_link === ad_link
                  ? { ...r, is_taken: new_is_taken, taken_by, lead_taken }
                  : r,
              ),
            }),
            false,
          );
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(insertSubscription);
      supabase.removeChannel(broadcastSubscription);
    };
  }, [mutate, tableName, managed]);

  return { data, error, isLoading };
}
