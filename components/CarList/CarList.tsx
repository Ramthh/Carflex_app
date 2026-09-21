"use client";
import { JSX, useEffect, useState } from "react";
import AutotraderLogo from "../Logos/AutotraderLogo";
import FacebookLogo from "../Logos/FacebookLogo";
import KijijiLogo from "../Logos/KijijiLogo";
import { CircleGauge, Save, SearchCheck, SquarePen, X } from "lucide-react";
import Link from "next/link";
import CopyToClipboardButton from "../CustomButton/CopyToClipboardButton";
import timeAgo from "@/helpers/timeAgoCalculator";
import { updateCarValue } from "@/helpers/updateCarValue";
import { mutate } from "swr";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import priceStatus from "@/helpers/priceStatus";
import formatNumber from "@/helpers/formatNumber";
import { checkTrim } from "@/helpers/checkTrim";
import { supabase } from "@/lib/supabase";
export default function CarList({
  carDetails,
  session,
}: {
  carDetails: any;
  session: any;
}) {
  // const { data: session } = useSession();
  const [trimStatus, setTrimStatus] = useState("");
  const [trimLoading, setTrimLoading] = useState(false);
  const [isTaken, setIsTaken] = useState(carDetails.is_taken || false);
  const [takenAt, setTakenAt] = useState<Date | null>(
    carDetails.taken_at ? new Date(carDetails.taken_at) : null,
  );
  const [estimatedValue, setEstimatedValue] = useState<number>(
    carDetails.real_value ||
      carDetails.real_value === 0 ||
      carDetails.real_value !== null
      ? carDetails.real_value
      : carDetails.est_value,
  );
  const [editMode, setEditMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>(carDetails.status);
  const role = session?.user?.role;
  const managed = session?.user?.identityKind === 'workspace';
  useEffect(() => {
    if (carDetails.is_taken) {
      setIsTaken(true);
      setTakenAt(carDetails.taken_at ? carDetails.taken_at : null);
    }
  }, [carDetails.is_taken]);
  const onCheck = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setTrimLoading(true);
      const result = await checkTrim(carDetails);
      setTrimStatus(result);
    } catch (error) {
      console.error("Error checking trim:", error);
    } finally {
      setTrimLoading(false);
    }
  };

  async function handleSave() {
    if (estimatedValue === carDetails.est_value) {
      setEditMode(false);
      return;
    }
    try {
      setLoading(true);
      await updateCarValue(
        carDetails.ad_link,
        carDetails.source,
        estimatedValue,
      );
      mutate(`/api/cars/${carDetails.ad_link}?source=${carDetails.source}`);
      const newStatus = priceStatus(
        carDetails.price,
        carDetails.est_value,
        estimatedValue,
      );
      setStatus(newStatus);
      setEditMode(false);
    } catch {
      alert("Failed to update value");
    } finally {
      setLoading(false);
    }
  }
  async function handleIsTaken() {
    try {
      const res = await fetch("/api/cars/take", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_taken: true,
          taken_by: session?.user?.name || null,
          ad_link: carDetails.ad_link,
          source: carDetails.source,
        }),
      });
      await supabase.channel("broadcast-updates").send({
        type: "broadcast",
        event: "is_taken_changed",
        payload: {
          ad_link: carDetails.ad_link,
          new_is_taken: true,
          taken_by: session?.user?.name || null,
          source: carDetails.source,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to take car" + res.statusText);
      }
      setIsTaken(true);
    } catch (error) {
      console.error("Failed to mark car as taken", error);
    }
  }
  async function handleLeaderTaken() {
    try {
      const res = await fetch("/api/cars/take", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_taken: session?.user?.name || null,
          ad_link: carDetails.ad_link,
          source: carDetails.source,
        }),
      });
      await supabase.channel("broadcast-updates").send({
        type: "broadcast",
        event: "is_taken_changed",
        payload: {
          ad_link: carDetails.ad_link,
          lead_taken: session?.user?.name || null,
          source: carDetails.source,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to take car" + res.statusText);
      }
    } catch (error) {
      console.error("Failed to mark car as taken", error);
    }
  }

  const logoMap: Record<string, JSX.Element> = {
    autotrader: <AutotraderLogo className="w-8 sm:w-10" />,
    kijiji: <KijijiLogo className="w-8 sm:w-10" />,
    facebook: <FacebookLogo className="w-6 sm:w-8" />,
  };

  const statusStyleMap: Record<string, { bg: string; border: string }> = {
    Steal: {
      bg: "bg-green-700",
      border: "border-green-700",
    },
    Good: {
      bg: "bg-green-400",
      border: "border-green-400",
    },
    Potential: {
      bg: "bg-yellow-500",
      border: "border-yellow-500",
    },
    Entertain: {
      bg: "bg-red-500",
      border: "border-red-500",
    },
    Unknown: {
      bg: "bg-gray-500",
      border: "border-gray-500",
    },
  } as const;
  return (
    <Link
      href={`${carDetails.ad_link}`}
      target="_blank"
      rel="noopener noreferrer"
      className={` h-full  flex bg-gray-200 rounded-lg  shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 ease-in-out relative ${
        carDetails.source === "r" ? "border-2 border-red-500 " : ""
      } `}
      onClick={
        role === "TEAM"
          ? handleIsTaken
          : role === "LEADER"
            ? handleLeaderTaken
            : undefined
      }
    >
      <div
        className={`relative w-20 sm:w-40 md:w-50 aspect-8/3 overflow-hidden rounded-md shrink-0 `}
      >
        <img
          src={carDetails.image_src || "/Car-placeholder.png"}
          alt={carDetails.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <button
          onClick={onCheck}
          className="absolute top-2 left-2 p-2 rounded-md border border-gray-400 shadow-sm bg-white hover:bg-gray-200 transition cursor-pointer"
        >
          {trimLoading ? (
            <LoadingSpinner size={4} />
          ) : trimStatus === "out" ? (
            <X size={18} className="text-red-500" />
          ) : trimStatus ? (
            trimStatus
          ) : (
            <SearchCheck size={18} />
          )}
        </button>
      </div>
      <div className="absolute bottom-2 left-2 opacity-60 bg-gray-200 p-1 rounded-md ">
        {logoMap[carDetails.source.toLowerCase()]}
      </div>

      <div className="w-full h-full p-5  flex flex-col justify-between">
        <div className="flex gap-2 flex-wrap ">
          <p
            className={`border border-solid border-gray-300 text-gray-200 bg-primary  
             
          shadow-md   px-2.5 py-0.5  rounded-md text-xs w-fit sm:text-base`}
          >
            CA${formatNumber(carDetails.price)}
          </p>
          <p
            className={` ${statusStyleMap[status]?.bg}
              text-white px-2.5 py-0.5 rounded-md min-[490px]:hidden text-xs`}
          >
            {status}
          </p>
          <div className="flex">
            <p
              className={` ${statusStyleMap[status]?.bg}
              text-white px-2.5 py-0.5 rounded-l-md max-[490px]:hidden text-xs  sm:text-base`}
            >
              {status}
            </p>
            <p
              className={`border border-solid ${statusStyleMap[status]?.border} 
            flex items-center shadow-md text-gray-700 px-2.5 py-0.5 max-[490px]:rounded-l-md rounded-r-md text-xs w-fit sm:text-sm`}
            >
              Est. ~ CA$
              <input
                autoFocus
                onClick={(e) => e.preventDefault()}
                type="text"
                className={` max-w-7 sm:max-w-10 text-gray-700 focus:outline-none  ${
                  editMode ? " bg-white" : " bg-transparent"
                }`}
                value={estimatedValue ? estimatedValue.toLocaleString() : ""}
                disabled={!editMode}
                onChange={(e) => {
                  setEstimatedValue(Number(e.target.value.replace(/,/g, "")));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  }

                  if (e.key === "Escape") {
                    e.preventDefault();
                    setEditMode(false);
                  }
                }}
              />
              {!managed && <button className="ml-2 cursor-pointer">
                {loading ? (
                  <LoadingSpinner size={4} />
                ) : editMode ? (
                  <Save
                    size={17}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSave();
                    }}
                  />
                ) : (
                  <SquarePen
                    size={17}
                    onClick={(e) => {
                      e.preventDefault();
                      setEditMode(true);
                    }}
                  />
                )}
              </button>}
            </p>
          </div>

          <CopyToClipboardButton
            carDetails={{
              ...carDetails,
              taken_at: takenAt,
            }}
            status={status}
            estimatedValue={estimatedValue}
            session={session}
          />
          <p>
            {carDetails.active_listings
              ? ` (${carDetails.active_listings} active)`
              : ""}
          </p>
        </div>
        <div className="flex justify-between flex-wrap items-center  ">
          <div>
            <p
              className={`text-black  overflow-ellipsis line-clamp-1 font-bold text-sm sm:text-base md:text-lg pr-2.5 ${isTaken ? "line-through" : ""}`}
            >
              {carDetails.title}
            </p>
            {carDetails.lead_taken !== null &&
              (role === "OWNER" || role === "LEADER") && (
                <p className="text-gray-500">
                  Seen by:{" "}
                  {carDetails.lead_taken
                    ? carDetails.lead_taken.split(" ")[0]
                    : ""}
                </p>
              )}
            {isTaken && (
              <p className="text-gray-500">
                Taken by:{" "}
                {carDetails.taken_by ? carDetails.taken_by.split(" ")[0] : ""}
              </p>
            )}
          </div>
          <p className="text-gray-700 sm:text-sm text-xs">
            {timeAgo(carDetails.created_at)}
          </p>
        </div>
        <div className="max-w-3xl">
          <p className="text-black max-w-full overflow-ellipsis max-sm:hidden line-clamp-1 lg:line-clamp-2 text-sm">
            {carDetails.description}
          </p>
        </div>
        <div className="w-full flex justify-between items-center mt-1">
          <p className="text-gray-500 flex items-center text-xs sm:text-base gap-2">
            <CircleGauge className="w-4 h-4" />
            {formatNumber(carDetails.odometer)} Km
          </p>
          {carDetails.seller_name !== null &&
          carDetails.seller_name !== "Safe" ? (
            <div
              className={`border border-gray-300 text-gray-200  shadow-md px-2.5 py-0.5 rounded-md cursor-default  w-fit sm:text-base text-xs 
                bg-red-600
              `}
            >
              {carDetails.seller_name}
            </div>
          ) : carDetails.is_sus !== null ? (
            <div
              className={`border border-gray-300 text-gray-200  shadow-md px-2.5 py-0.5 rounded-md cursor-default  w-fit sm:text-base text-xs  ${
                carDetails.is_sus ? "bg-red-600" : "bg-green-600"
              }`}
            >
              {carDetails.is_sus ? carDetails.sus_type || "Suspicious" : "Safe"}
            </div>
          ) : (
            <div
              className={`border border-gray-300 text-gray-200  shadow-md px-2.5 py-0.5 rounded-md cursor-default  w-fit sm:text-base text-xs bg-gray-500 `}
            >
              Unknown
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
