const cursorOf=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const date=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0;
const order=(a,b)=>date(b.postedAt)-date(a.postedAt)||date(b.discoveredAt)-date(a.discoveredAt)||String(b.id).localeCompare(String(a.id));

// Reapply events after a snapshot's transaction cursor. A slow HTTP response
// cannot erase a discovery or replace a new estimate with an older value.
/** @param {{offset?:number,limit?:number,onChange?:(page:any)=>void,onReconcile?:()=>void,maxEvents?:number}} options */
export function createFinderLiveState({offset=0,limit=24,onChange,onReconcile,maxEvents=1000}={}){
 let value=null,cursor=0,snapshotCursor=0,floor=0,closed=false;const journal=new Map();
 function apply(base,events){
  let items=[...base.items],total=base.total;
  for(const event of events){
   const index=items.findIndex(item=>item.id===event.listingId),item=event.item;
   if(!item){if(index>=0){items.splice(index,1);total=Math.max(0,total-1);}else if(event.kind==='remove')total=Math.max(0,total-1);continue;}
   if(index>=0)items[index]=item;
   else if(event.kind==='discovery'){total++;if(offset===0)items.push(item);}
  }
  if(offset===0)items.sort(order);
  items=items.slice(0,limit);
  return {...base,items,total,changeCursor:cursor,nextOffset:items.length&&offset+items.length<total?offset+items.length:null};
 }
 return {
  getCursor:()=>cursor,
  snapshot(next){
   if(closed)return;const at=cursorOf(next.changeCursor);
   if(at<floor){onReconcile?.();return;}if(value&&at<snapshotCursor)return;
   snapshotCursor=at;cursor=Math.max(cursor,at);for(const id of journal.keys())if(id<=at)journal.delete(id);
   value=apply(next,[...journal.values()]);onChange?.(value);
  },
  change(id,event){
   if(closed||!value||!Number.isSafeInteger(id)||id<=cursor||!event||typeof event.listingId!=='string'||!['discovery','update','remove'].includes(event.kind))return false;
   if(event.item&&(event.item.id!==event.listingId||event.item.source!=='facebook'||event.item.privateImport))return false;
   cursor=id;journal.set(id,event);if(journal.size>maxEvents){floor=journal.keys().next().value;journal.delete(floor);}
   value=apply(value,[event]);onChange?.(value);return true;
  },
  close(){closed=true;journal.clear();}
 };
}
