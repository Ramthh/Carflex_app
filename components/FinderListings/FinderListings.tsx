'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,LayoutGrid,List,RefreshCw,Search} from 'lucide-react';
import styles from './FinderListings.module.css';
import {useFinderFeed} from './useFinderFeed';
import FinderCarCard from './FinderCarCard';
import type {Page} from './types';

type View='grid'|'list';
const VIEW_STORAGE_KEY='carflex-finder-view';
export default function FinderListings(){
 const [view,setView]=useState<View>('grid'),[now,setNow]=useState(()=>Date.now());
 const resultsRef=useRef<HTMLDivElement>(null),scrollAnchor=useRef<{id:string;top:number;scroller:HTMLElement}|null>(null);
 const beforePage=(data:Page|null)=>{
  scrollAnchor.current=null;if(!data)return;
  const results=resultsRef.current,scroller=results?.closest('main');
  if(results&&scroller&&results.getBoundingClientRect().top<scroller.getBoundingClientRect().top){
   const bounds=scroller.getBoundingClientRect(),nextIds=new Set(data.items.map(car=>car.id));
   const visible=Array.from(results.querySelectorAll<HTMLElement>('[data-car-id]')).find(card=>nextIds.has(card.dataset.carId||'')&&card.getBoundingClientRect().bottom>bounds.top&&card.getBoundingClientRect().top<bounds.bottom);
   if(visible)scrollAnchor.current={id:visible.dataset.carId!,top:visible.getBoundingClientRect().top,scroller};
  }
 };
 const {page,offset,setOffset,loading,error,refresh,catalog,filtersLoading,filtersError,filterId,chooseFilter,retryFilters,searchText,changeSearch,submitSearch,clearSearch}=useFinderFeed<Page>({beforePage});
 useEffect(()=>{try{const saved=localStorage.getItem(VIEW_STORAGE_KEY);if(saved==='grid'||saved==='list')setView(saved);}catch{/* The view still works when browser storage is unavailable. */}},[]);
 const changeView=(next:View)=>{setView(next);try{localStorage.setItem(VIEW_STORAGE_KEY,next);}catch{/* Keep the current selection for this visit. */}};
 useLayoutEffect(()=>{
  const anchor=scrollAnchor.current;scrollAnchor.current=null;
  if(!anchor)return;
  const card=Array.from(resultsRef.current?.querySelectorAll<HTMLElement>('[data-car-id]')||[]).find(item=>item.dataset.carId===anchor.id);
  if(card&&anchor.scroller.isConnected){
   const target=anchor.scroller.scrollTop+card.getBoundingClientRect().top-anchor.top;
   anchor.scroller.scrollTop=target;
   // Keep the correction after the browser finishes its layout/focus work.
   const frame=requestAnimationFrame(()=>{if(anchor.scroller.isConnected)anchor.scroller.scrollTop=target;});
   return()=>cancelAnimationFrame(frame);
  }
 },[page]);

 useEffect(()=>{const tick=()=>setNow(Date.now()),timer=setInterval(()=>{if(document.visibilityState==='visible')tick();},1000);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};},[]);
 return <section className={`${styles.finder} mx-auto w-full max-w-7xl px-4 py-6 md:px-7`}>
  <header className="mb-5">
   <div className="flex flex-wrap items-center justify-between gap-4">
   <div className="flex items-center gap-3"><img src="/Logo.png" alt="Carflex" className="h-8 w-20 object-contain"/><h1 className="text-2xl font-semibold text-slate-900">Carflex Finder</h1></div>
   <div className={styles.actions}>
    <div role="group" aria-label="Car listing view" className={styles.viewToggle}>
     <button type="button" aria-label="Grid view" aria-pressed={view==='grid'} aria-controls="finder-results" onClick={()=>changeView('grid')} className={styles.viewButton}><LayoutGrid size={16} aria-hidden="true"/>Grid</button>
     <button type="button" aria-label="List view" aria-pressed={view==='list'} aria-controls="finder-results" onClick={()=>changeView('list')} className={styles.viewButton}><List size={16} aria-hidden="true"/>List</button>
    </div>
    <button type="button" onClick={refresh} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading?'animate-spin':''}/>Refresh</button>
   </div>
   </div>
   <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
   <form role="search" aria-label="Search Finder cars" className="w-full min-w-0 max-w-lg" onSubmit={event=>{event.preventDefault();submitSearch();}}>
    <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-100">
     <Search size={18} className="shrink-0 text-slate-400" aria-hidden="true"/>
     <label htmlFor="finder-search" className="shrink-0 text-sm font-medium text-slate-700">Search cars</label>
     <input id="finder-search" type="search" value={searchText} onChange={event=>changeSearch(event.target.value)} maxLength={200} placeholder="Make, model, year, or location" aria-describedby="finder-search-help" aria-controls="finder-results" disabled={filterId===undefined} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"/>
     {searchText&&<button type="button" onClick={clearSearch} className="shrink-0 rounded px-2 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50" aria-label="Clear car search">Clear</button>}
    </div>
    <p id="finder-search-help" className="sr-only">Search within the selected saved filter. Results update as you type.</p>
   </form>
   <div className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 text-sm">
    <label htmlFor="finder-saved-filter" className="font-medium text-slate-700">Saved filter</label>
    <select id="finder-saved-filter" value={filterId??'__loading'} disabled={!catalog} onChange={event=>chooseFilter(event.target.value)} className="max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 disabled:opacity-60">
     {filterId===undefined&&<option value="__loading">{filtersLoading?'Loading saved filters…':'Choose a saved filter'}</option>}
     <option value="">All Facebook cars</option>
     {filterId&&catalog&&!catalog.items.some(item=>item.id===filterId)&&<option value={filterId}>Saved filter unavailable</option>}
     {catalog?.items.map(item=><option key={item.id} value={item.id} disabled={!item.available}>{item.name}{!item.available?' (Unavailable)':''}</option>)}
    </select>
    {filtersError&&<span role="alert" className="text-red-700">{filtersError} <button type="button" onClick={retryFilters} className="underline">Try again</button></span>}
   </div>
   </div>
  </header>
  <p className="mb-5 text-sm text-slate-500">New Est. and Old Est. each have their own deal label. Cars appear as soon as they are discovered; details update as they are collected.</p>
  {error&&<div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error} <button type="button" className="ml-2 underline" onClick={refresh}>Try again</button></div>}
  {loading&&!page&&filterId!==undefined&&<div role="status" className="py-12 text-center text-slate-500">Loading Finder cars…</div>}
  {page&&<><div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-500"><span>{page.total.toLocaleString('en-CA')} cars{page.countPending&&<span> · Updating count</span>}</span><span>{({posted:'Newest posted first',newest:'Newest discovered first',price:'Lowest price first','price-high':'Highest price first',mileage:'Lowest mileage first'} as Record<string,string>)[page.sort||page.selectedFilter?.sort||'posted']}</span></div>
   {!page.items.length?<div id="finder-results" className="rounded-xl border border-slate-200 p-12 text-center text-slate-500"><Search className="mx-auto mb-3"/>No matching cars right now.</div>:<div ref={resultsRef} id="finder-results" data-view={view} className={view==='list'?styles.list:'grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3'}>
    {page.items.map(car=><FinderCarCard key={car.id} car={car} now={now}/>)}
   </div>}
   <nav aria-label="Finder pages" className="mt-6 flex items-center justify-center gap-5"><button type="button" disabled={offset===0||loading} onClick={()=>setOffset(n=>Math.max(0,n-24))} className="flex items-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40"><ChevronLeft size={16}/>Previous</button><span className="text-sm text-slate-500">Page {Math.floor(offset/24)+1}</span><button type="button" disabled={page.nextOffset===null||loading} onClick={()=>{if(page.nextOffset!==null)setOffset(page.nextOffset);}} className="flex items-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40">Next<ChevronRight size={16}/></button></nav>
  </>}
 </section>;
}
