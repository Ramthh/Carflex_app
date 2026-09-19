'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight,Facebook,LayoutGrid,List,MapPin,RefreshCw,Search} from 'lucide-react';
import styles from './FinderListings.module.css';
import {finderMileageLabel} from '@/lib/finder-mileage.mjs';
import {finderPriceStatus} from '@/lib/finder-price-status.mjs';
import {finderTimeAgo} from '@/lib/finder-time.mjs';
import {useFinderFeed} from './useFinderFeed';

type Estimate={amount?:number;status?:string;refreshing?:boolean};
type Car={id:string;title:string;price?:number;priceCurrency?:string;year?:number;mileage?:number;location?:string;imageUrl?:string;url?:string;postedAt?:string;discoveredAt?:string;reviewCategory?:string;otherSellers?:boolean;publicDescription?:string;detailCoverage?:{mileage?:string;description?:string};valuationEvidence?:{mileage?:{status?:string;valueKm?:number|null}};priceEstimate?:Estimate;oldPriceEstimate?:Estimate};
type Page={items:Car[];total:number;nextOffset:number|null;generatedAt:string;changeCursor?:number;countPending?:boolean;sort?:string;selectedFilter?:{id:string;name:string;sort:string}|null};
type View='grid'|'list';
const VIEW_STORAGE_KEY='carflex-finder-view';
const money=(value?:number)=>value==null?'Price not listed':new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(value);
const safeLink=(value?:string)=>{try{const url=new URL(value||'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:undefined;}catch{return undefined;}};
function EstimateBadge({label,estimate,ask}:{label:string;estimate?:Estimate;ask?:number}){
 const status=finderPriceStatus(ask,estimate);
 const colors={Steal:'bg-green-700 text-white',Good:'bg-green-100 text-green-900',Potential:'bg-yellow-100 text-yellow-900',Entertain:'bg-red-100 text-red-800',Unknown:'bg-slate-100 text-slate-700'};
 const available=estimate?.status==='available'&&Number.isFinite(estimate.amount)&&estimate.amount!>0;
 const updating=available&&estimate?.refreshing===true;
 return <span className="inline-flex items-center gap-1 text-xs" title={updating?`Showing the last ${label} while the updated estimate is calculated. ${status} compares the asking price with that last estimate.`:`${status} based on ${label} compared with the asking price`}><span className={`rounded px-2 py-1 ${colors[status]}`}>{label} {available?money(estimate!.amount):'—'}{updating&&<span className="ml-1 font-normal">· Updating</span>}</span><strong className={`rounded border-2 border-black px-2 py-0.5 ${colors[status]}`}>{status}</strong></span>;
}
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
 const {page,offset,setOffset,loading,error,refresh,catalog,filtersLoading,filtersError,filterId,chooseFilter,retryFilters}=useFinderFeed<Page>({beforePage});
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
   <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
    <label htmlFor="finder-saved-filter" className="font-medium text-slate-700">Saved filter</label>
    <select id="finder-saved-filter" value={filterId??'__loading'} disabled={!catalog} onChange={event=>chooseFilter(event.target.value)} className="max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 disabled:opacity-60">
     {filterId===undefined&&<option value="__loading">{filtersLoading?'Loading saved filters…':'Choose a saved filter'}</option>}
     <option value="">All Facebook cars</option>
     {filterId&&catalog&&!catalog.items.some(item=>item.id===filterId)&&<option value={filterId}>Saved filter unavailable</option>}
     {catalog?.items.map(item=><option key={item.id} value={item.id} disabled={!item.available}>{item.name}{!item.available?' (Unavailable)':''}</option>)}
    </select>
    {filtersError&&<span role="alert" className="text-red-700">{filtersError} <button type="button" onClick={retryFilters} className="underline">Try again</button></span>}
   </div>
  </header>
  <p className="mb-5 text-sm text-slate-500">New Est. and Old Est. each have their own deal label. Cars appear as soon as they are discovered; details update as they are collected.</p>
  {error&&<div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error} <button type="button" className="ml-2 underline" onClick={refresh}>Try again</button></div>}
  {loading&&!page&&filterId!==undefined&&<div role="status" className="py-12 text-center text-slate-500">Loading Finder cars…</div>}
  {page&&<><div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-500"><span>{page.total.toLocaleString('en-CA')} cars{page.countPending&&<span> · Updating count</span>}</span><span>{({posted:'Newest posted first',newest:'Newest discovered first',price:'Lowest price first','price-high':'Highest price first',mileage:'Lowest mileage first'} as Record<string,string>)[page.sort||page.selectedFilter?.sort||'posted']}</span></div>
   {!page.items.length?<div id="finder-results" className="rounded-xl border border-slate-200 p-12 text-center text-slate-500"><Search className="mx-auto mb-3"/>No matching cars right now.</div>:<div ref={resultsRef} id="finder-results" data-view={view} className={view==='list'?styles.list:'grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3'}>
    {page.items.map(car=><article key={car.id} data-car-id={car.id} className={`${styles.card} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm`}>
     <div className={`${styles.photo} relative aspect-[16/9] bg-slate-100`}>{safeLink(car.imageUrl)?<img src={safeLink(car.imageUrl)} alt={car.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-slate-400">Photo unavailable</div>}<span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs text-slate-700"><Facebook size={13} className="shrink-0 text-blue-600" aria-hidden="true"/>Facebook</span>{safeLink(car.url)&&<a href={safeLink(car.url)} target="_blank" rel="noopener noreferrer" className={styles.photoLink} aria-label={`View ${car.title} on Facebook (opens in a new tab)`} title="View ad on Facebook (opens in a new tab)"/>}</div>
     <div className={`${styles.cardBody} p-4`}><div className={styles.carHeading}><h2 className="text-lg font-semibold text-slate-900">{car.title}</h2><p className={`${styles.price} mt-2 text-2xl font-bold text-slate-900`}>{money(car.price)} <span className="text-xs font-normal text-slate-500">CAD</span></p></div>
      <div className="my-3 flex flex-wrap gap-2"><EstimateBadge label="New Est." estimate={car.priceEstimate} ask={car.price}/><EstimateBadge label="Old Est." estimate={car.oldPriceEstimate} ask={car.price}/></div>
      <p className="text-sm text-slate-500">{finderMileageLabel(car)}</p>
      <div className="mt-2 space-y-1 text-xs font-bold tabular-nums text-slate-500"><p>Facebook posted: <time dateTime={car.postedAt||undefined} title={car.postedAt||'The source has no posting time'}>{finderTimeAgo(car.postedAt,now)}</time></p><p>Discovered: <time dateTime={car.discoveredAt||undefined} title={car.discoveredAt||'Discovery time is not available'}>{finderTimeAgo(car.discoveredAt,now)}</time></p></div>
      <div className={`${styles.carFooter} mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm`}><span className={`${styles.location} flex items-center gap-1 text-slate-500`}><MapPin size={14}/>{car.location||'Location not listed'}</span>{safeLink(car.url)&&<a href={safeLink(car.url)} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 font-medium text-teal-700">View ad<ArrowUpRight size={16}/></a>}</div>
      {car.publicDescription?<details className={`${styles.description} mt-3 text-sm`}><summary className="cursor-pointer text-teal-700">Description{car.detailCoverage?.description==='truncated'?' · Partial description':''}</summary><p className="mt-2 whitespace-pre-wrap text-slate-600">{car.publicDescription}</p></details>:<p className="mt-3 text-sm text-slate-500">{car.detailCoverage?.description==='not-found'?'No description found on the ad':car.detailCoverage?.description==='unavailable'?'Description unavailable':'Description not yet collected'}</p>}
     </div>
    </article>)}
   </div>}
   <nav aria-label="Finder pages" className="mt-6 flex items-center justify-center gap-5"><button type="button" disabled={offset===0||loading} onClick={()=>setOffset(n=>Math.max(0,n-24))} className="flex items-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40"><ChevronLeft size={16}/>Previous</button><span className="text-sm text-slate-500">Page {Math.floor(offset/24)+1}</span><button type="button" disabled={page.nextOffset===null||loading} onClick={()=>{if(page.nextOffset!==null)setOffset(page.nextOffset);}} className="flex items-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40">Next<ChevronRight size={16}/></button></nav>
  </>}
 </section>;
}
