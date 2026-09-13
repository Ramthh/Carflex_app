'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight,LayoutGrid,List,MapPin,RefreshCw,Search} from 'lucide-react';
import styles from './FinderListings.module.css';

type Estimate={amount?:number;status?:string};
type Car={id:string;title:string;price?:number;priceCurrency?:string;year?:number;mileage?:number;location?:string;imageUrl?:string;url?:string;postedAt?:string;publicDescription?:string;priceEstimate?:Estimate;oldPriceEstimate?:Estimate};
type Page={items:Car[];total:number;nextOffset:number|null;generatedAt:string};
type View='grid'|'list';
const VIEW_STORAGE_KEY='carflex-finder-view';
const money=(value?:number)=>value==null?'Price not listed':new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(value);
const safeLink=(value?:string)=>{try{const url=new URL(value||'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:undefined;}catch{return undefined;}};
function EstimateBadge({label,estimate,ask}:{label:string;estimate?:Estimate;ask?:number}){
 if(estimate?.status!=='available'||!Number.isFinite(estimate.amount))return null;
 const delta=ask==null?null:estimate.amount!-ask;
 const color=delta==null?'bg-slate-100 text-slate-700':delta>=3000?'bg-emerald-100 text-emerald-800':delta>=500?'bg-amber-100 text-amber-900':'bg-red-100 text-red-800';
 return <span className={`rounded px-2 py-1 text-xs ${color}`}>{label} {money(estimate.amount)}</span>;
}
export default function FinderListings(){
 const [page,setPage]=useState<Page|null>(null),[offset,setOffset]=useState(0),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [view,setView]=useState<View>('grid');
 const resultsRef=useRef<HTMLDivElement>(null);
 const loadedOffset=useRef<number|null>(null);
 const scrollAnchor=useRef<{id:string;top:number;scroller:HTMLElement}|null>(null);
 useEffect(()=>{try{const saved=localStorage.getItem(VIEW_STORAGE_KEY);if(saved==='grid'||saved==='list')setView(saved);}catch{/* The view still works when browser storage is unavailable. */}},[]);
 const changeView=(next:View)=>{setView(next);try{localStorage.setItem(VIEW_STORAGE_KEY,next);}catch{/* Keep the current selection for this visit. */}};
 useEffect(()=>{
  const abort=new AbortController();setLoading(true);setError('');
  // Only a different page needs an empty loading state. Refreshes keep the
  // keyed cards mounted, including their images and expanded descriptions.
  if(loadedOffset.current!==offset)setPage(null);
  fetch(`/api/finder?offset=${offset}`,{cache:'no-store',signal:abort.signal}).then(async response=>{
   const data=await response.json();
   if(abort.signal.aborted)return;
   if(!response.ok){
    if(response.status===401||response.status===403){setPage(null);loadedOffset.current=null;}
    throw Error(data.error||'Finder could not load cars.');
   }
   return data as Page;
  }).then(data=>{
   if(abort.signal.aborted||!data)return;
   scrollAnchor.current=null;
   const results=resultsRef.current,scroller=results?.closest('main');
   if(loadedOffset.current===offset&&results&&scroller&&results.getBoundingClientRect().top<scroller.getBoundingClientRect().top){
    const bounds=scroller.getBoundingClientRect(),nextIds=new Set(data.items.map(car=>car.id));
    const visible=Array.from(results.querySelectorAll<HTMLElement>('[data-car-id]')).find(card=>nextIds.has(card.dataset.carId||'')&&card.getBoundingClientRect().bottom>bounds.top&&card.getBoundingClientRect().top<bounds.bottom);
    if(visible)scrollAnchor.current={id:visible.dataset.carId!,top:visible.getBoundingClientRect().top,scroller};
   }
   loadedOffset.current=offset;setPage(data);
  }).catch(reason=>{if(!abort.signal.aborted)setError(reason.message||'Finder could not load cars.');}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>abort.abort();
 },[offset,revision]);
 useLayoutEffect(()=>{
  const anchor=scrollAnchor.current;scrollAnchor.current=null;
  if(!anchor)return;
  const card=Array.from(resultsRef.current?.querySelectorAll<HTMLElement>('[data-car-id]')||[]).find(item=>item.dataset.carId===anchor.id);
  if(card&&anchor.scroller.isConnected)anchor.scroller.scrollTop+=card.getBoundingClientRect().top-anchor.top;
 },[page]);
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible')setRevision(n=>n+1);},60000);return()=>clearInterval(timer);},[]);
 return <section className={`${styles.finder} mx-auto w-full max-w-7xl px-4 py-6 md:px-7`}>
  <header className="mb-5">
   <div className="flex flex-wrap items-center justify-between gap-4">
   <div className="flex items-center gap-3"><img src="/Logo.png" alt="Carflex" className="h-8 w-20 object-contain"/><h1 className="text-2xl font-semibold text-slate-900">Carflex Finder</h1></div>
   <div className={styles.actions}>
    <div role="group" aria-label="Car listing view" className={styles.viewToggle}>
     <button type="button" aria-label="Grid view" aria-pressed={view==='grid'} aria-controls="finder-results" onClick={()=>changeView('grid')} className={styles.viewButton}><LayoutGrid size={16} aria-hidden="true"/>Grid</button>
     <button type="button" aria-label="List view" aria-pressed={view==='list'} aria-controls="finder-results" onClick={()=>changeView('list')} className={styles.viewButton}><List size={16} aria-hidden="true"/>List</button>
    </div>
    <button type="button" onClick={()=>setRevision(n=>n+1)} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading?'animate-spin':''}/>Refresh</button>
   </div>
   </div>
   <p className="mt-2 text-sm text-slate-500">Unknown sellers · Posted in the last 7 days · Ontario, Québec & New Brunswick</p>
  </header>
  <p className="mb-5 text-sm text-slate-500">Dealer, Safe and Other sellers are excluded. Unknown means there is not enough evidence to classify the seller.</p>
  {error&&<div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error} <button type="button" className="ml-2 underline" onClick={()=>setRevision(n=>n+1)}>Try again</button></div>}
  {loading&&!page&&<div role="status" className="py-12 text-center text-slate-500">Loading Finder cars…</div>}
  {page&&<><div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-500"><span>{page.total.toLocaleString('en-CA')} cars</span><span>Newest posted first</span></div>
   {!page.items.length?<div id="finder-results" className="rounded-xl border border-slate-200 p-12 text-center text-slate-500"><Search className="mx-auto mb-3"/>No matching cars right now.</div>:<div ref={resultsRef} id="finder-results" data-view={view} className={view==='list'?styles.list:'grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3'}>
    {page.items.map(car=><article key={car.id} data-car-id={car.id} className={`${styles.card} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm`}>
     <div className={`${styles.photo} relative aspect-[16/9] bg-slate-100`}>{safeLink(car.imageUrl)?<img src={safeLink(car.imageUrl)} alt={car.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-slate-400">Photo unavailable</div>}<span className="absolute bottom-3 left-3 rounded bg-white px-2 py-1 text-xs text-slate-700">Unknown</span>{safeLink(car.url)&&<a href={safeLink(car.url)} target="_blank" rel="noopener noreferrer" className={styles.photoLink} aria-label={`View ${car.title} on Facebook (opens in a new tab)`} title="View ad on Facebook (opens in a new tab)"/>}</div>
     <div className={`${styles.cardBody} p-4`}><div className={styles.carHeading}><h2 className="text-lg font-semibold text-slate-900">{car.title}</h2><p className={`${styles.price} mt-2 text-2xl font-bold text-slate-900`}>{money(car.price)} <span className="text-xs font-normal text-slate-500">CAD</span></p></div>
      <div className="my-3 flex flex-wrap gap-2"><EstimateBadge label="New Est." estimate={car.priceEstimate} ask={car.price}/><EstimateBadge label="Old Est." estimate={car.oldPriceEstimate} ask={car.price}/></div>
      <p className="text-sm text-slate-500">{car.mileage==null?'Mileage not listed':`${car.mileage.toLocaleString('en-CA')} km`}</p>
      <div className={`${styles.carFooter} mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm`}><span className={`${styles.location} flex items-center gap-1 text-slate-500`}><MapPin size={14}/>{car.location||'Location not listed'}</span>{safeLink(car.url)&&<a href={safeLink(car.url)} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 font-medium text-teal-700">View ad<ArrowUpRight size={16}/></a>}</div>
      {car.publicDescription&&<details className={`${styles.description} mt-3 text-sm`}><summary className="cursor-pointer text-teal-700">Description</summary><p className="mt-2 whitespace-pre-wrap text-slate-600">{car.publicDescription}</p></details>}
     </div>
    </article>)}
   </div>}
   <nav aria-label="Finder pages" className="mt-6 flex items-center justify-center gap-5"><button type="button" disabled={offset===0||loading} onClick={()=>setOffset(n=>Math.max(0,n-24))} className="flex items-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40"><ChevronLeft size={16}/>Previous</button><span className="text-sm text-slate-500">Page {Math.floor(offset/24)+1}</span><button type="button" disabled={page.nextOffset===null||loading} onClick={()=>{if(page.nextOffset!==null)setOffset(page.nextOffset);}} className="flex items-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40">Next<ChevronRight size={16}/></button></nav>
  </>}
 </section>;
}
