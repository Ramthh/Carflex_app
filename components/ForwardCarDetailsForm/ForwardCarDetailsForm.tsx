import { useState } from "react";
import { Car } from "../Types/CarColumns";

export default function ForwardCarDetailsForm({
  carDetails,
  onSuccess,
}: {
  carDetails: Car;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [pickDate, setPickDate] = useState("");
  const [title, setTitle] = useState(carDetails.title);
  const [vin, setVin] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [regName, setRegName] = useState("");
  const [pickLocation, setPickLocation] = useState("");
  const [price, setPrice] = useState(carDetails.lowest_price || "");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [lien, setLien] = useState(false);
  const [lienAmount, setLienAmount] = useState("");
  const [lienBank, setLienBank] = useState("");
  const [accidents, setAccidents] = useState(false);
  const [claims, setClaims] = useState("");
  const [damage, setDamage] = useState(false);
  const [damageCondition, setDamageCondition] = useState("");
  const [damageLocation, setDamageLocation] = useState("");

  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !pickDate ||
      !title ||
      !price ||
      !paymentMethod ||
      !pickLocation ||
      !sellerName ||
      !regName ||
      !vin ||
      (damage && (!damageCondition || !damageLocation)) ||
      (lien && (!lienAmount || !lienBank)) ||
      (claims && !accidents)
    ) {
      setError(true);
      setErrorText("Please fill all required fields");
      return;
    }
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(false);
      const res = await fetch(`/api/cars/sheet/forward`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          vin,
          sellerName,
          regName,
          pickLocation,
          pickDate,
          price,
          paymentMethod,
          lien,
          lienAmount: parseFloat(lienAmount),
          lienBank,
          accidents,
          claims: parseFloat(claims),
          damage,
          damageCondition,
          damageLocation,
          adLink: carDetails.ad_link,
          streetAddress,
          city,
          province,
          postalCode,
          sellerPhone: carDetails.seller_phone,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to forward car");
      }
      setIsLoading(false);
      onSuccess();
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setError(true);
      setErrorText("Failed to forward car");
      console.error("Failed to copy text or forward car", error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 ">
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">
          Pickup Date <span className="text-red-500 text-2xl">*</span>
        </label>
        <input
          type="dateTime-local"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          placeholder="Enter Pickup Date"
          value={pickDate}
          onChange={(e) => setPickDate(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">
          Title <span className="text-red-500 text-2xl">*</span>
        </label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-lg flex-5 disabled:bg-gray-200"
          placeholder="(e.g.,) 2022 Ford F150"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled
        />
      </div>

      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">
          Vin <span className="text-red-500 text-2xl">*</span>
        </label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          placeholder="Enter Vin"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          required
        />
      </div>

      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">
          Registration Name <span className="text-red-500 text-2xl">*</span>
        </label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          placeholder="Enter Registration Name"
          value={regName}
          onChange={(e) => setRegName(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">
          Seller Name <span className="text-red-500 text-2xl">*</span>
        </label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          placeholder="Enter Seller Name"
          value={sellerName}
          onChange={(e) => setSellerName(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">
          Pickup Location <span className="text-red-500 text-2xl">*</span>
        </label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          placeholder="Enter Pickup Location"
          value={pickLocation}
          onChange={(e) => setPickLocation(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">Street Address</label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          placeholder="Enter Street Address"
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
        />
      </div>
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">City</label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          placeholder="Enter City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">Province</label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          placeholder="Enter Province"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
        />
      </div>
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">Postal Code</label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          placeholder="Enter Postal Code"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">
          Price <span className="text-red-500 text-2xl">*</span>
        </label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          placeholder="Enter Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">
          Payment Method <span className="text-red-500 text-2xl">*</span>
        </label>
        <input
          type="text"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          placeholder="Enter Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">
          Lien <span className="text-red-500 text-2xl">*</span>
        </label>
        <select
          name="source"
          id="source"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          value={lien ? "yes" : "no"}
          onChange={(e) => {
            setLien(e.target.value === "yes");
            setLienAmount("");
            setLienBank("");
          }}
          required
        >
          <option value="" disabled>
            Select Lien Status
          </option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      {lien && (
        <>
          <div className="flex justify-between items-center gap-4">
            <label className=" flex-2">
              Lien Amount<span className="text-red-500 text-2xl">*</span>
            </label>
            <input
              type="text"
              className="p-2 border border-gray-300 rounded-lg flex-5"
              placeholder="Enter Lien Amount"
              value={lienAmount}
              onChange={(e) => setLienAmount(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-between items-center gap-4">
            <label className=" flex-2">Lien Bank</label>
            <input
              type="text"
              className="p-2 border border-gray-300 rounded-lg flex-5"
              placeholder="Enter Lien Bank"
              value={lienBank}
              onChange={(e) => setLienBank(e.target.value)}
            />
          </div>
        </>
      )}
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">
          Accidents <span className="text-red-500 text-2xl">*</span>
        </label>
        <select
          name="source"
          id="source"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          value={accidents ? "yes" : "no"}
          onChange={(e) => {
            setAccidents(e.target.value === "yes");
            setClaims("");
          }}
          required
        >
          <option value="" disabled>
            Select Accidents Status
          </option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      {accidents && (
        <>
          <div className="flex justify-between items-center gap-4">
            <label className=" flex-2">
              Accidents Claim <span className="text-red-500 text-2xl">*</span>
            </label>
            <input
              type="text"
              className="p-2 border border-gray-300 rounded-lg flex-5"
              placeholder="Enter Accidents Claim"
              value={claims}
              onChange={(e) => setClaims(e.target.value)}
              required
            />
          </div>
        </>
      )}
      <div className="flex justify-between items-center gap-4">
        <label className=" flex-2">
          Damage <span className="text-red-500 text-2xl">*</span>
        </label>
        <select
          name="damage"
          id="damage"
          className="p-2 border border-gray-300 rounded-lg flex-5"
          value={damage ? "yes" : "no"}
          onChange={(e) => {
            setDamage(e.target.value === "yes");
            setDamageCondition("");
            setDamageLocation("");
          }}
          required
        >
          <option value="" disabled>
            Select Damage Status
          </option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      {damage && (
        <>
          <div className="flex justify-between items-center gap-4">
            <label className=" flex-2">
              Damage Condition <span className="text-red-500 text-2xl">*</span>
            </label>
            <input
              type="text"
              className="p-2 border border-gray-300 rounded-lg flex-5"
              placeholder="Enter Damage Description"
              value={damageCondition}
              onChange={(e) => setDamageCondition(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-between items-center gap-4">
            <label className=" flex-2">
              Damage Location <span className="text-red-500 text-2xl">*</span>
            </label>
            <input
              type="text"
              className="p-2 border border-gray-300 rounded-lg flex-5"
              placeholder="Enter Damage Location"
              value={damageLocation}
              onChange={(e) => setDamageLocation(e.target.value)}
              required
            />
          </div>
        </>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
        >
          {isLoading ? "Forwarding..." : "Forward Car"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500">
          {errorText || "An error occurred while forwarding the car."}
        </p>
      )}
    </form>
  );
}
