'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight,MapPin,RefreshCw,Search} from 'lucide-react';

type Estimate={amount?:number;status?:string};
type Car={id:string;title:string;price?:number;priceCurrency?:string;year?:number;mileage?:number;location?:string;imageUrl?:string;url?:string;postedAt?:string;publicDescription?:string;priceEstimate?:Estimate;oldPriceEstimate?:Estimate};
type Page={items:Car[];total:number;nextOffset:number|null;generatedAt:string};
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
 useEffect(()=>{
  const abort=new AbortController();setLoading(true);setPage(null);setError('');
  fetch(`/api/finder?offset=${offset}`,{cache:'no-store',signal:abort.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'Finder could not load cars.');return data;}).then(data=>{if(!abort.signal.aborted)setPage(data);}).catch(reason=>{if(!abort.signal.aborted)setError(reason.message||'Finder could not load cars.');}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>abort.abort();
 },[offset,revision]);
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible')setRevision(n=>n+1);},60000);return()=>clearInterval(timer);},[]);
 return <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-7">
  <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
   <div><div className="flex items-center gap-3"><img src="/Logo.png" alt="Carflex" className="h-8 w-20 object-contain"/><h1 className="text-2xl font-semibold text-slate-900">Carflex Finder</h1></div><p className="mt-2 text-sm text-slate-500">Unknown sellers · Posted in the last 7 days · Ontario, Québec & New Brunswick</p></div>
   <button type="button" onClick={()=>setRevision(n=>n+1)} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading?'animate-spin':''}/>Refresh</button>
  </header>
  <p className="mb-5 text-sm text-slate-500">Dealer, Safe and Other sellers are excluded. Unknown means there is not enough evidence to classify the seller.</p>
  {error&&<div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error} <button type="button" className="ml-2 underline" onClick={()=>setRevision(n=>n+1)}>Try again</button></div>}
  {loading&&<div role="status" className="py-12 text-center text-slate-500">Loading Finder cars…</div>}
  {page&&<><div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-500"><span>{page.total.toLocaleString('en-CA')} cars</span><span>Newest posted first</span></div>
   {!page.items.length?<div className="rounded-xl border border-slate-200 p-12 text-center text-slate-500"><Search className="mx-auto mb-3"/>No matching cars right now.</div>:<div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
    {page.items.map(car=><article key={car.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
     <div className="relative aspect-[16/9] bg-slate-100">{safeLink(car.imageUrl)?<img src={safeLink(car.imageUrl)} alt={car.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-slate-400">Photo unavailable</div>}<span className="absolute bottom-3 left-3 rounded bg-white px-2 py-1 text-xs text-slate-700">Unknown</span></div>
     <div className="p-4"><h2 className="text-lg font-semibold text-slate-900">{car.title}</h2><p className="mt-2 text-2xl font-bold text-slate-900">{money(car.price)} <span className="text-xs font-normal text-slate-500">CAD</span></p>
      <div className="my-3 flex flex-wrap gap-2"><EstimateBadge label="New Est." estimate={car.priceEstimate} ask={car.price}/><EstimateBadge label="Old Est." estimate={car.oldPriceEstimate} ask={car.price}/></div>
      <p className="text-sm text-slate-500">{car.mileage==null?'Mileage not listed':`${car.mileage.toLocaleString('en-CA')} km`}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm"><span className="flex items-center gap-1 text-slate-500"><MapPin size={14}/>{car.location||'Location not listed'}</span>{safeLink(car.url)&&<a href={safeLink(car.url)} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 font-medium text-teal-700">View ad<ArrowUpRight size={16}/></a>}</div>
      {car.publicDescription&&<details className="mt-3 text-sm"><summary className="cursor-pointer text-teal-700">Description</summary><p className="mt-2 whitespace-pre-wrap text-slate-600">{car.publicDescription}</p></details>}
     </div>
    </article>)}
   </div>}
   <nav aria-label="Finder pages" className="mt-6 flex items-center justify-center gap-5"><button type="button" disabled={offset===0||loading} onClick={()=>setOffset(n=>Math.max(0,n-24))} className="flex items-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40"><ChevronLeft size={16}/>Previous</button><span className="text-sm text-slate-500">Page {Math.floor(offset/24)+1}</span><button type="button" disabled={page.nextOffset===null||loading} onClick={()=>{if(page.nextOffset!==null)setOffset(page.nextOffset);}} className="flex items-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40">Next<ChevronRight size={16}/></button></nav>
  </>}
 </section>;
}
