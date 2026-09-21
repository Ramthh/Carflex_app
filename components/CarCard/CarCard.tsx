"use client";
import { JSX, useState } from "react";
import AutotraderLogo from "../Logos/AutotraderLogo";
import FacebookLogo from "../Logos/FacebookLogo";
import KijijiLogo from "../Logos/KijijiLogo";
import {
  CheckCheck,
  CircleGauge,
  Save,
  SearchCheck,
  SquarePen,
} from "lucide-react";
import Link from "next/link";
import CopyToClipboardButton from "../CustomButton/CopyToClipboardButton";
import timeAgo from "@/helpers/timeAgoCalculator";
import { updateCarValue } from "@/helpers/updateCarValue";
import { mutate } from "swr";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import priceStatus from "@/helpers/priceStatus";
import formatNumber from "@/helpers/formatNumber";
export default function CarCard({ carDetails, session }: { carDetails: any; session?: any }) {
  const managed = session?.user?.identityKind === 'workspace';
  const [trimStatus, setTrimStatus] = useState<{
    status: boolean;
    value: string;
  }>();
  const [estimatedValue, setEstimatedValue] = useState<number>(
    carDetails.real_value || carDetails.real_value === 0
      ? carDetails.real_value
      : carDetails.est_value,
  );
  const [editMode, setEditMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>(carDetails.status);

  const onCheck = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTrimStatus({ status: true, value: "" });
    setTimeout(() => {
      setTrimStatus(undefined);
    }, 3000);
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
      const newStatus = await priceStatus(
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
      className={`h-120 min-h-fit bg-gray-200 rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-shadow duration-300 ease-in-out relative ${
        carDetails.source === "r" ? "border-2 border-red-500 " : ""
      }`}
    >
      <button
        onClick={onCheck}
        className="absolute top-4 left-2 p-2 rounded-md border border-gray-400 shadow-sm bg-white hover:bg-gray-200 transition cursor-pointer "
      >
        {trimStatus?.status === true ? (
          <CheckCheck size={18} />
        ) : trimStatus?.status === false ? (
          trimStatus.value
        ) : (
          <SearchCheck size={18} />
        )}
      </button>
      <div
        className={`w-full h-1/2 overflow-hidden rounded-md ${
          trimStatus?.status === true
            ? "border-4 border-green-500"
            : trimStatus?.status === false
              ? "border-4 border-red-500"
              : ""
        }`}
      >
        <img
          src={carDetails.image_src || "/Car-placeholder.png"}
          alt={carDetails.title}
          className="w-full object-cover h-full"
        />
      </div>
      <div className="w-full min-h-1/2 p-5 lg:pb-8 flex flex-col justify-between">
        <div className=" w-full flex justify-between items-center ">
          <div className=" flex items-center gap-3 flex-row ">
            {logoMap[carDetails.source.toLowerCase()]}

            <p
              className={` ${statusStyleMap[status]?.bg}
            text-white px-2.5 py-0.5 rounded-4xl`}
            >
              {status}
            </p>
            <CopyToClipboardButton
              carDetails={carDetails}
              status={status}
              estimatedValue={estimatedValue}
              session={session}
            />
          </div>
          <p className="text-gray-500 flex items-center gap-0.5">
            <CircleGauge className="w-4 h-4" />
            {formatNumber(carDetails.odometer)} Km
          </p>
        </div>
        <div className="flex justify-between flex-wrap items-center  ">
          <p className="text-black font-bold text-lg pr-2.5 line-clamp-2">
            {carDetails.title}
          </p>
          <p className="text-gray-700 text-sm">
            {timeAgo(carDetails.created_at)}
          </p>
        </div>
        <div className="flex justify-between items-center  flex-wrap gap-2 ">
          <div className="flex gap-2 flex-wrap ">
            <p
              className={`border border-solid border-gray-300 text-gray-200 bg-primary  
              
              shadow-md   px-2.5 py-0.5  rounded-md text-sm w-fit sm:text-base`}
            >
              CA${formatNumber(carDetails.price)}
            </p>
            <p
              className={`border border-solid ${statusStyleMap[status]?.border} 
            flex items-center shadow-md text-gray-700 px-2.5 py-0.5  rounded-md text-sm w-fit sm:text-base`}
            >
              Est. value ~ CA$
              <input
                autoFocus
                onClick={(e) => e.preventDefault()}
                type="text"
                className={` max-w-10  text-gray-700 focus:outline-none  ${
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
                    handleSave(); // 🔥 your existing save function
                  }

                  if (e.key === "Escape") {
                    e.preventDefault();
                    setEditMode(false); // optional but recommended
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
          {carDetails.is_sus !== null ? (
            <div
              className={`border border-gray-300 text-gray-200  shadow-md px-2.5 py-0.5 rounded-md cursor-default  w-fit sm:text-base text-sm  ${
                carDetails.is_sus ? "bg-red-600" : "bg-green-600"
              }`}
            >
              {carDetails.is_sus ? "Suspicious" : "Safe"}
            </div>
          ) : (
            <div
              className={`border border-gray-300 text-gray-200  shadow-md px-2.5 py-0.5 rounded-md cursor-default  w-fit sm:text-base text-sm bg-gray-500 `}
            >
              Unknown
            </div>
          )}
        </div>
        <p className="text-black overflow-ellipsis line-clamp-2 text-sm">
          {carDetails.description}
        </p>
      </div>
    </Link>
  );
}
