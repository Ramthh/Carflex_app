import {finderFilterId,finderFilterRevision,finderError,FINDER_SORTS} from './finder-filters.mjs';
const apiOrigin='https://finder.carflexplus.ca';
// Concurrent viewers share an upstream read; its age starts with the request,
// so a slow response does not restart the freshness window after it arrives.
// The route still validates each user's session before calling this function.
export function createFinderFeedReader({read=readFinderFeed,now=Date.now,ttlMs=750,maxEntries=24}={}){
 const entries=new Map();
 return async options=>{
  const id=JSON.stringify([options.key,options.offset??0,options.filterId??null]),existing=entries.get(id);
  if(existing&&(existing.pending||now()-existing.startedAt<ttlMs))return existing.promise;
  const entry={pending:true,startedAt:now(),promise:null};
  if(!entries.has(id)&&entries.size>=maxEntries)entries.delete(entries.keys().next().value);
  entries.set(id,entry);
  entry.promise=Promise.resolve().then(()=>read(options)).then(result=>{
   entry.pending=false;
   if(result.status!==200&&entries.get(id)===entry)entries.delete(id);
   return result;
  },error=>{if(entries.get(id)===entry)entries.delete(id);throw error;});
  return entry.promise;
 };
}
export const readLiveFinderFeed=createFinderFeedReader();
export async function readFinderFeed({key,offset=0,filterId=null,fetcher=fetch}){
 if(!/^cf_finder_[a-f0-9]{64}$/.test(key||''))return {status:503,body:{error:'Carflex Finder is not connected yet.'}};
 if(!Number.isSafeInteger(offset)||offset<0||offset>10000000)return {status:400,body:{error:'Invalid Finder page.'}};
 try{filterId=finderFilterId(filterId);}catch{return {status:400,body:{error:'Choose a valid saved filter.'}};}
 try{
  const params=new URLSearchParams({inventory:'all',limit:'24',offset:String(offset)});if(filterId)params.set('filterId',filterId);
  const response=await fetcher(`${apiOrigin}/api/integrations/railway/listings?${params}`,{headers:{'X-API-Key':key,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)return finderError(response);
  if(!response.headers.get('Content-Type')?.includes('application/json'))throw Error('Unexpected response');
  const page=await response.json();
  if(!Array.isArray(page.items)||page.items.length>24||page.scope!==(filterId?'saved-public-facebook':'all-public-facebook')||!Number.isSafeInteger(page.total)||page.total<0||page.offset!==offset||page.limit!==24)throw Error('Invalid Finder response');
  if(filterId&&(page.selectedFilter?.id!==filterId||!FINDER_SORTS.includes(page.selectedFilter?.sort)||!FINDER_SORTS.includes(page.sort)||page.sort!==page.selectedFilter.sort))throw Error('Wrong selected filter');
  finderFilterRevision(page.filterRevision,filterId);
  if(!filterId&&page.selectedFilter)throw Error('Unexpected selected filter');
  if(page.nextOffset!==null&&(!Number.isSafeInteger(page.nextOffset)||page.nextOffset!==offset+page.items.length||page.nextOffset<=offset))throw Error('Invalid pagination');
  if(page.items.some(item=>!item||item.source!=='facebook'||item.privateImport))throw Error('Unexpected Finder inventory');
  return {status:200,body:page};
 }catch{return {status:503,body:{error:'Carflex Finder could not load cars. Please try again.'}};}
}
