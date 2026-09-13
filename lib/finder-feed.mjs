const apiOrigin='https://finder.carflexplus.ca';
export async function readFinderFeed({key,offset=0,fetcher=fetch}){
 if(!/^cf_finder_[a-f0-9]{64}$/.test(key||''))return {status:503,body:{error:'Carflex Finder is not connected yet.'}};
 if(!Number.isSafeInteger(offset)||offset<0||offset>10000000)return {status:400,body:{error:'Invalid Finder page.'}};
 try{
  const response=await fetcher(`${apiOrigin}/api/integrations/railway/listings?inventory=all&limit=24&offset=${offset}`,{headers:{'X-API-Key':key,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)return {status:response.status===429?429:503,body:{error:response.status===429?'Finder is busy. Please try again in a minute.':'Carflex Finder is temporarily unavailable.'}};
  if(!response.headers.get('Content-Type')?.includes('application/json'))throw Error('Unexpected response');
  const page=await response.json();
  if(!Array.isArray(page.items)||page.items.length>24||page.scope!=='all-public-facebook'||!Number.isSafeInteger(page.total)||page.total<0||page.offset!==offset||page.limit!==24)throw Error('Invalid Finder response');
  if(page.nextOffset!==null&&(!Number.isSafeInteger(page.nextOffset)||page.nextOffset!==offset+page.items.length||page.nextOffset<=offset))throw Error('Invalid pagination');
  if(page.items.some(item=>!item||item.source!=='facebook'||item.privateImport))throw Error('Unexpected Finder inventory');
  return {status:200,body:page};
 }catch{return {status:503,body:{error:'Carflex Finder could not load cars. Please try again.'}};}
}
