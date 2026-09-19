'use client';
import {ArrowUpRight,Facebook,MapPin} from 'lucide-react';
import styles from './FinderListings.module.css';
import {finderMileageLabel} from '@/lib/finder-mileage.mjs';
import {finderPriceStatus} from '@/lib/finder-price-status.mjs';
import {finderTimeAgo} from '@/lib/finder-time.mjs';
import FinderSourceBadge from '@/components/Logos/FinderSourceBadge';
import type {Car,Estimate} from './types';

const money=(value?:number)=>value==null?'Price not listed':new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(value);
const safeLink=(value?:string)=>{try{const url=new URL(value||'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:undefined;}catch{return undefined;}};
function EstimateBadge({label,estimate,ask}:{label:string;estimate?:Estimate;ask?:number}){
 const status=finderPriceStatus(ask,estimate);
 const colors={Steal:'bg-green-700 text-white',Good:'bg-green-100 text-green-900',Potential:'bg-yellow-100 text-yellow-900',Entertain:'bg-red-100 text-red-800',Unknown:'bg-slate-100 text-slate-700'};
 const available=estimate?.status==='available'&&Number.isFinite(estimate.amount)&&estimate.amount!>0;
 const updating=available&&estimate?.refreshing===true;
 return <span className="inline-flex items-center gap-1 text-xs" title={updating?`Showing the last ${label} while the updated estimate is calculated. ${status} compares the asking price with that last estimate.`:`${status} based on ${label} compared with the asking price`}><span className={`rounded px-2 py-1 ${colors[status]}`}>{label} {available?money(estimate!.amount):'—'}{updating&&<span className="ml-1 font-normal">· Updating</span>}</span><strong className={`rounded border-2 border-black px-2 py-0.5 ${colors[status]}`}>{status}</strong></span>;
}
export default function FinderCarCard({car,now}:{car:Car;now:number}){
 return <article data-car-id={car.id} className={`${styles.card} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm`}>
     <div className={`${styles.photo} relative aspect-[16/9] bg-slate-100`}>{safeLink(car.imageUrl)?<img src={safeLink(car.imageUrl)} alt={car.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-slate-400">Photo unavailable</div>}<span className="pointer-events-none absolute bottom-3 left-3 inline-flex flex-wrap items-center gap-1"><span className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs text-slate-700"><Facebook size={13} className="shrink-0 text-blue-600" aria-hidden="true"/>Facebook</span><FinderSourceBadge/></span>{safeLink(car.url)&&<a href={safeLink(car.url)} target="_blank" rel="noopener noreferrer" className={styles.photoLink} aria-label={`View ${car.title} on Facebook (opens in a new tab)`} title="View ad on Facebook (opens in a new tab)"/>}</div>
     <div className={`${styles.cardBody} p-4`}><div className={styles.carHeading}><h2 className="text-lg font-semibold text-slate-900">{car.title}</h2><p className={`${styles.price} mt-2 text-2xl font-bold text-slate-900`}>{money(car.price)} <span className="text-xs font-normal text-slate-500">CAD</span></p></div>
      <div className="my-3 flex flex-wrap gap-2"><EstimateBadge label="New Est." estimate={car.priceEstimate} ask={car.price}/><EstimateBadge label="Old Est." estimate={car.oldPriceEstimate} ask={car.price}/></div>
      <p className="text-sm text-slate-500">{finderMileageLabel(car)}</p>
      <div className="mt-2 space-y-1 text-xs font-bold tabular-nums text-slate-500"><p>Facebook posted: <time dateTime={car.postedAt||undefined} title={car.postedAt||'The source has no posting time'}>{finderTimeAgo(car.postedAt,now)}</time></p><p>Discovered: <time dateTime={car.discoveredAt||undefined} title={car.discoveredAt||'Discovery time is not available'}>{finderTimeAgo(car.discoveredAt,now)}</time></p></div>
      <div className={`${styles.carFooter} mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-sm`}><span className={`${styles.location} flex items-center gap-1 text-slate-500`}><MapPin size={14}/>{car.location||'Location not listed'}</span>{safeLink(car.url)&&<a href={safeLink(car.url)} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 font-medium text-teal-700">View ad<ArrowUpRight size={16}/></a>}</div>
      {car.publicDescription?<details className={`${styles.description} mt-3 text-sm`}><summary className="cursor-pointer text-teal-700">Description{car.detailCoverage?.description==='truncated'?' · Partial description':''}</summary><p className="mt-2 whitespace-pre-wrap text-slate-600">{car.publicDescription}</p></details>:<p className="mt-3 text-sm text-slate-500">{car.detailCoverage?.description==='not-found'?'No description found on the ad':car.detailCoverage?.description==='unavailable'?'Description unavailable':'Description not yet collected'}</p>}
     </div>
    </article>;
}
