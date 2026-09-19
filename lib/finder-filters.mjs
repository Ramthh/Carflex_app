export const FINDER_SORTS=['posted','newest','price','price-high','mileage'];
export function finderFilterId(value){
 if(value===null||value===undefined)return null;
 if(typeof value!=='string'||! /^[A-Za-z0-9_-]{1,200}$/.test(value))throw Error('Choose a valid saved filter.');
 return value;
}
export function finderFilterRevision(value,filterId){
 if(!filterId){if(value!==null&&value!==undefined)throw Error('Unexpected filter revision.');return null;}
 if(typeof value!=='string'||! /^[a-f0-9]{64}$/.test(value))throw Error('Reload this saved filter before connecting live updates.');
 return value;
}
export function finderSelection(catalog,choice){
 // An explicit choice (including All) survives a changed provider default.
 const id=choice===undefined?(catalog.defaultId||''):choice;
 const item=id?catalog.items.find(value=>value.id===id):null;
 return {id,sort:item?.sort||'posted',error:id&&!item?'This saved filter was deleted or is no longer available. Choose another filter.':item&&!item.available?(item.unavailableReason||'This saved filter is unavailable. Choose another filter.') :''};
}
export async function finderError(response){
 const status=[400,404,409,429].includes(response.status)?response.status:503;
 let error=status===429?'Finder is busy. Please try again in a minute.':status===404?'This saved filter was deleted. Choose another filter.':status===409?'This saved filter is unavailable. Choose another filter.':'Carflex Finder is temporarily unavailable.';
 if([400,404,409].includes(status)){try{const body=await response.json();if(typeof body.error==='string')error=body.error.slice(0,300);}catch{}}
 return {status,body:{error}};
}
export async function readFinderFilters({key,fetcher=fetch}){
 if(!/^cf_finder_[a-f0-9]{64}$/.test(key||''))return {status:503,body:{error:'Carflex Finder is not connected yet.'}};
 try{
  const response=await fetcher('https://finder.carflexplus.ca/api/integrations/railway/listings/filters',{headers:{'X-API-Key':key,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)return finderError(response);
  if(!response.headers.get('Content-Type')?.includes('application/json'))throw Error('Unexpected response');
  const catalog=await response.json();
  if(!Array.isArray(catalog.items)||catalog.items.length>50)throw Error('Invalid saved filters');
  const ids=new Set(),items=catalog.items.map(item=>{
   if(!item||finderFilterId(item.id)!==item.id||ids.has(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>80||!FINDER_SORTS.includes(item.sort)||typeof item.available!=='boolean')throw Error('Invalid saved filter');
   ids.add(item.id);return {id:item.id,name:item.name,sort:item.sort,available:item.available,...(typeof item.unavailableReason==='string'?{unavailableReason:item.unavailableReason.slice(0,300)}:{})};
  });
  if(catalog.defaultId!==null&&!ids.has(catalog.defaultId))throw Error('Invalid default filter');
  return {status:200,body:{items,defaultId:catalog.defaultId}};
 }catch{return {status:503,body:{error:'Saved filters could not load. Please try again.'}};}
}
