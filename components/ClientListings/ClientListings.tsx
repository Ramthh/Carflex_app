"use client";
import { useEffect, useRef, useState } from "react";
import CarCard from "../CarCard/CarCard";
import CarList from "../CarList/CarList";
import CarWatcher from "../CarWatcher/CarWatcher";
import CallerPicker from "../CallerPicker/CallerPicker";
import { useSession } from "next-auth/react";
import Modal from "../ui/Modal";
import { AddCarForm } from "../AddCarForm/AddCarForm";
import { useSettingsStore } from "@/store/useSettingStore";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import useRealtimeCars from "@/hooks/useRealtimeCars";
import FinderCarCard from "../FinderListings/FinderCarCard";
import { useFinderFeed } from "../FinderListings/useFinderFeed";
import type { Page } from "../FinderListings/types";
import finderStyles from "../FinderListings/FinderListings.module.css";
import { allListingsFeed } from "@/lib/all-listings-feed.mjs";

type Item = {
  id: number;
  title: string;
  price: string;
  location: string;
  odometer: string;
  image: string;
  ad_link: string;
  created_at: string;
  description: string;
  status: string;
  est_value: string;
  source: string;
  is_sus: boolean;
  real_value: string;
};

export default function ClientListings({
  active,
  initialCarsData,
  limit,
}: {
  active: string;
  initialCarsData: any[];
  limit?: number;
}) {
  const { data: session } = useSession();
  const managed = session?.user?.identityKind === 'workspace';
  const [view, setView] = useState<"card" | "list">("list");
  const SOURCES = ["facebook", "kijiji", "autotrader", "finder"];
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const isAll = active === "All";
  const finderEnabled = isAll && (selectedSources.length === 0 || selectedSources.includes("finder"));
  const legacyEnabled = !isAll || selectedSources.length === 0 || selectedSources.some(source => source !== "finder");
  const finder = useFinderFeed<Page>({beforePage:()=>{},enabled:finderEnabled,shareSavedFilter:true,readSearchFromUrl:false});
  const resultsRef = useRef<HTMLDivElement>(null), requestedFinderPage = useRef<number|null>(null);
  const [now,setNow] = useState(()=>Date.now());
  useEffect(()=>{
    if(!finderEnabled){requestedFinderPage.current=null;return;}
    const tick=()=>{if(document.visibilityState==='visible')setNow(Date.now());};
    tick();const timer=setInterval(tick,1000);document.addEventListener('visibilitychange',tick);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
  },[finderEnabled]);
  useEffect(()=>{
    if(requestedFinderPage.current!==null && finder.page?.offset===requestedFinderPage.current){
      requestedFinderPage.current=null;resultsRef.current?.scrollIntoView({block:'start'});
    }
  },[finder.page]);
  const changeFinderPage=(offset:number)=>{requestedFinderPage.current=offset;finder.setOffset(offset);};
  const callerName = useSettingsStore((s) => s.callerName);
  const [open, setOpen] = useState(false);
  // console.log("Initial cars data:", callerName);
  //   const { data, error, isLoading } = useSWR(
  //   [`${active.toLowerCase()}`, limit ?? 20],
  //   ([name, limit]) => {
  //     const result = fetchData({ name: name || "", limit });

  //     return result;
  //   },
  //   {
  //     refreshInterval: 30_000, // poll every 30 seconds
  //     fallbackData: { items: initialCarsData },
  //     revalidateOnFocus: true,
  //   },
  // );
  const { data, error, isLoading } = useRealtimeCars(
    active,
    limit,
    initialCarsData,
    managed,
  );
  function toggleSource(source: string) {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source],
    );
  }

  function clearFilters() {
    setSelectedSources([]);
  }

  if (error && !isAll) return <div className="text-red-600">Failed to load</div>;
  if (isLoading && !data && !isAll) return <div>Loading...</div>;
  const legacyRows: Item[] = data?.items || [];
  const seenIds = new Set<string>();
  const uniqueItems: Item[] = legacyRows.filter((item: { ad_link: string }) => {
    if (seenIds.has(item.ad_link)) return false;
    seenIds.add(item.ad_link);
    return true;
  });
  const items = isAll
    ? allListingsFeed({legacy:legacyRows,finder:finderEnabled ? finder.page?.items || [] : [],selectedSources})
    : uniqueItems.map(item=>({origin:'legacy',item,key:String(item.id)}));
  const finderFilterName = finder.page?.selectedFilter?.name || finder.catalog?.items.find(item=>item.id===finder.filterId)?.name || (finder.filterId ? 'Saved filter unavailable' : finder.filterId===undefined ? 'Loading saved filter…' : 'All Facebook cars');
  const finderUrl = '/listings/finder' + (finder.filterId===undefined ? '' : '?finderFilter='+encodeURIComponent(finder.filterId||'all'));
  // console.log("Filtered items:", items);
  return (
    <>
      {open && !managed && (
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Add Car">
          <AddCarForm
            onSuccess={() => setOpen(false)}
            sheet={callerName}
            sent_by_team={session?.user?.name || ""}
          />
        </Modal>
      )}

      <CarWatcher cars={legacyRows as any} />
      <div className={`${isAll ? finderStyles.finder : ''} px-4 sm:px-9 py-6`}>
        <div className="sm:w-full mb-8 flex justify-between items-center ">
          <p className="text-black text-2xl md:text-3xl font-bold tracking-wide ">
            {active} Listings
          </p>

          {!managed && <div className="flex items-center gap-4">
            {/* <AutoSwitch /> */}
            <button
              className="border border-primary text-sm hover:text-white transition-colors duration-300 bg-primary rounded-lg p-2 text-white hover:bg-lightPrimary cursor-pointer text-center"
              onClick={() => setOpen(true)}
            >
              <Plus size={18} />
            </button>
            <CallerPicker />

            {/* <SelectView view={view} setView={setView} /> */}
            {/* <SearchVin /> */}
          </div>}
        </div>
        {active === "All" && (
          <div role="group" aria-label="Filter by source" className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-5">
            <p className="font-semibold">Filter by source:</p>

            {SOURCES.map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.includes(s)}
                  onChange={() => toggleSource(s)}
                />
                <span className="capitalize">{s==='finder'?'Carflex Finder':s}</span>
              </label>
            ))}

            <button
              onClick={clearFilters}
              className="px-3 py-1 rounded bg-black text-white text-sm"
            >
              Clear
            </button>
          </div>
        )}

        {isAll && legacyEnabled && error && <p role="alert" className="mb-4 text-red-700">Other listing sources could not load.</p>}
        {finderEnabled && <section aria-label="Carflex Finder feed" className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p><strong>Carflex Finder</strong> · Saved filter: {finderFilterName}</p>
            <a href={finderUrl} className="font-medium text-teal-700 underline">Change Finder filter</a>
          </div>
          {finder.page && <p className="mt-2 text-slate-600">{finder.page.total.toLocaleString('en-CA')} matching Finder cars{finder.page.countPending?' · Updating count':''} · Finder page {Math.floor(finder.offset/24)+1}{legacyEnabled?' · Combined with the latest cars from other sources':''}</p>}
          {(finder.filtersError || finder.error) && <p role="alert" className="mt-2 text-red-700">{finder.filtersError || finder.error} <button type="button" onClick={finder.filtersError?finder.retryFilters:finder.refresh} className="underline">Try again</button></p>}
          {(finder.filtersLoading || (finder.loading && !finder.page)) && <p role="status" className="mt-2 text-slate-600">Loading Finder cars…</p>}
        </section>}

        {view === "list" ? (
          <div id="all-listings-results" ref={resultsRef} className={isAll ? finderStyles.list : 'grid grid-cols-1 gap-5'}>
            {items.map(entry => entry.origin==='finder' ? <FinderCarCard key={entry.key} car={entry.item} now={now}/> : (
              <CarList
                key={entry.key}
                carDetails={entry.item}
                session={session}
              />
            ))}
          </div>
        ) : (
          <div id="all-listings-results" ref={resultsRef} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-12">
            {items.map(entry => entry.origin==='finder' ? <FinderCarCard key={entry.key} car={entry.item} now={now}/> : <CarCard key={entry.key} carDetails={entry.item} session={session}/>)}
          </div>
        )}
        {isAll && !items.length && !isLoading && !(finderEnabled && (finder.loading || finder.filtersLoading || finder.error || finder.filtersError)) && <p className="py-8 text-center text-slate-500">No cars match the selected sources right now.</p>}
        {finderEnabled && finder.page && <nav aria-label="Finder pages in All Listings" className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
          <button type="button" aria-controls="all-listings-results" disabled={finder.offset===0||finder.loading} onClick={()=>changeFinderPage(Math.max(0,finder.offset-24))} className="flex items-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40"><ChevronLeft size={16}/>Previous Finder page</button>
          <span>Finder page {Math.floor(finder.offset/24)+1}</span>
          <button type="button" aria-controls="all-listings-results" disabled={finder.page.nextOffset===null||finder.loading} onClick={()=>{if(finder.page?.nextOffset!=null)changeFinderPage(finder.page.nextOffset);}} className="flex items-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40">Next Finder page<ChevronRight size={16}/></button>
        </nav>}
      </div>
      {/* <ConfirmDialog
        isOpen={open}
        title="Notify?"
        description="Are you sure you want to send this car?"
        onCancel={() => setOpen(false)}
        onConfirm={callNotifyApi}
        loading={loading}
      /> */}
    </>
  );
}
