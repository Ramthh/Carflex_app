export function facebookItemIdentity(value){
 if(typeof value!=='string'||!value)return null;
 try{
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!(url.hostname==='facebook.com'||url.hostname.endsWith('.facebook.com')))return null;
  const match=url.pathname.match(/^\/marketplace\/item\/(\d+)\/?$/);
  return match?`facebook:${match[1]}`:null;
 }catch{return null;}
}

function rowIdentity(origin,item,index){
 const source=origin==='finder'?'finder':String(item.source||'unknown');
 const link=origin==='finder'?item.url:item.ad_link;
 const scope=origin==='finder'?'finder':`legacy:${source}`;
 // Missing links must not collapse unrelated cars into the same undefined key.
 const fallback=item.id!==null&&item.id!==undefined?['id',String(item.id)]:['row',index];
 const identity=facebookItemIdentity(link)||(typeof link==='string'&&link.trim()?`url:${link.trim()}`:JSON.stringify([scope,...fallback]));
 return {key:JSON.stringify([scope,...fallback,identity]),identity};
}
function discoveredAt(entry){
 const value=entry.origin==='finder'?entry.item.discoveredAt:entry.item.created_at;
 const time=typeof value==='string'?Date.parse(value):NaN;
 return Number.isFinite(time)?time:-Infinity;
}

/** @param {{legacy?:any[],finder?:any[],selectedSources?:string[]}} options */
export function allListingsFeed({legacy=[],finder=[],selectedSources=[]}={}){
 const all=selectedSources.length===0,selected=new Set(selectedSources),candidates=[];
 // Select origins first. A hidden Finder duplicate must never suppress a
 // Facebook row, while selected Finder cards take precedence when both exist.
 if(all||selected.has('finder'))finder.forEach((item,index)=>candidates.push({origin:'finder',item,...rowIdentity('finder',item,index)}));
 legacy.forEach((item,index)=>{if(all||selected.has(item.source))candidates.push({origin:'legacy',item,...rowIdentity('legacy',item,index)});});
 const seen=new Set(),items=candidates.filter(entry=>{if(seen.has(entry.identity))return false;seen.add(entry.identity);return true;});
 if(!all&&selected.size===1&&selected.has('finder'))return items;
 // Mixed inventory has one clear order. A Finder-only view retains the saved
 // filter's server ordering, including price and mileage sorts.
 return items.sort((a,b)=>{
  const left=discoveredAt(a),right=discoveredAt(b);
  return (left===right?0:right>left?1:-1)||(a.key<b.key?-1:a.key>b.key?1:0);
 });
}
