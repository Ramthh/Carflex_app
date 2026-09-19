const cursorOf=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const compare=(a,b)=>a===b||(a==null&&b==null)?0:a==null?-1:b==null?1:a<b?-1:1;
const descendingId=(a,b)=>compare(b.id,a.id);
// Match SQLite, including NULL placement and binary ID tie-breaking.
export function finderOrder(sort='posted'){
 return(a,b)=>sort==='price'?compare(a.price,b.price)||descendingId(a,b):sort==='price-high'?compare(b.price,a.price)||descendingId(a,b):sort==='mileage'?compare(a.mileage,b.mileage)||descendingId(a,b):sort==='newest'?compare(b.discoveredAt,a.discoveredAt)||descendingId(a,b):compare(b.postedAt,a.postedAt)||compare(b.discoveredAt,a.discoveredAt)||descendingId(a,b);
}

// Reapply events after a snapshot's transaction cursor. A slow HTTP response
// cannot erase a discovery or replace a new estimate with an older value.
/** @param {{offset?:number,limit?:number,filterId?:string|null,onChange?:(page:any)=>void,onReconcile?:()=>void,maxEvents?:number}} options */
export function createFinderLiveState({offset=0,limit=24,filterId=null,onChange,onReconcile,maxEvents=1000}={}){
 let value=null,cursor=0,snapshotCursor=0,floor=0,closed=false;const journal=new Map();
 function apply(base,events){
  let items=[...base.items],total=base.total,countPending=!!base.countPending,reconcile=false;const order=finderOrder(base.sort||base.selectedFilter?.sort||'posted');
  for(const event of events){
   const index=items.findIndex(item=>item.id===event.listingId),item=event.item;
   if(!item){
    if(index>=0){items.splice(index,1);total=Math.max(0,total-1);reconcile=true;}
    else if(event.kind==='remove'&&!filterId)total=Math.max(0,total-1);
    else if(filterId&&event.kind!=='discovery')countPending=true;
    continue;
   }
   if(index>=0){if(order(items[index],item)!==0)reconcile=true;items[index]=item;}
   else{
    if(event.kind==='discovery')total++;
    else if(filterId){
     countPending=true;
     // Unknown off-page membership affects the count, but must not launch a
     // full inventory COUNT for every unrelated backend update. Reconcile
     // promptly only when this candidate enters the visible first page.
     if(offset===0&&(items.length<limit||order(item,[...items].sort(order)[limit-1])<0))reconcile=true;
    }
    // An updated car can enter this filter or move into its first page.
    // Its exact count contribution is reconciled, never guessed.
    if(offset===0)items.push(item);
   }
   if(offset>0&&event.kind==='discovery')reconcile=true;
  }
  if(offset===0)items.sort(order);
  items=items.slice(0,limit);
  return {value:{...base,items,total,countPending,changeCursor:cursor,nextOffset:offset+limit<total?offset+limit:null},reconcile};
 }
 return {
  getCursor:()=>cursor,
  snapshot(next){
   if(closed||(next.selectedFilter?.id||null)!==filterId)return;const at=cursorOf(next.changeCursor);
   if(at<floor){onReconcile?.();return;}if(value&&at<snapshotCursor)return;
   snapshotCursor=at;cursor=Math.max(cursor,at);for(const id of journal.keys())if(id<=at)journal.delete(id);
   const result=apply(next,[...journal.values()]);value=result.value;onChange?.(value);if(result.reconcile)onReconcile?.();
  },
  change(id,event){
   if(closed||!value||!Number.isSafeInteger(id)||id<=cursor||!event||typeof event.listingId!=='string'||!['discovery','update','remove'].includes(event.kind))return false;
   if(event.item&&(event.item.id!==event.listingId||event.item.source!=='facebook'||event.item.privateImport))return false;
   cursor=id;journal.set(id,event);if(journal.size>maxEvents){floor=journal.keys().next().value;journal.delete(floor);}
   const previous=value,result=apply(value,[event]);value=result.value;
   if(value.total!==previous.total||value.countPending!==previous.countPending||value.items.length!==previous.items.length||value.items.some((item,i)=>item!==previous.items[i]))onChange?.(value);
   if(result.reconcile)onReconcile?.();return true;
  },
  close(){closed=true;journal.clear();}
 };
}
