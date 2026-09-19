import {createFinderLiveState} from './finder-live.mjs';
import {finderFilterRevision} from './finder-filters.mjs';

// One controller belongs to one selection/page. Disposal synchronously closes
// its stream and aborts its request; delayed callbacks cannot cross selections.
/** @param {{filterId?:string|null,offset?:number,onPage:(page:any)=>void,onLoading:(loading:boolean)=>void,onError:(error:string)=>void,onReset:()=>void,fetcher?:typeof fetch,EventSourceClass?:any,setTimer?:any,clearTimer?:any,now?:()=>number,isVisible?:()=>boolean}} options */
export function createFinderController({filterId=null,offset=0,onPage,onLoading,onError,onReset,fetcher=fetch,EventSourceClass=globalThis.EventSource,setTimer=setTimeout,clearTimer=clearTimeout,now=Date.now,isVisible=()=>true}){
 let closed=false,halted=false,stream=null,streamRevision=null,snapshotRevision,abort=null,timer=null,reconcileTimer=null,lastRequest=-Infinity,live=false,loading=false,reconcileAgain=false;
 const active=()=>!closed&&!halted;
 const cancelTimers=()=>{if(timer!==null)clearTimer(timer);if(reconcileTimer!==null)clearTimer(reconcileTimer);timer=reconcileTimer=null;};
 const makeState=()=>createFinderLiveState({filterId,offset,onChange:page=>{if(active())onPage(page);},onReconcile:reconcile});
 let state=makeState();
 function schedule(ms){if(!active())return;if(timer!==null)clearTimer(timer);timer=setTimer(()=>{timer=null;void refresh();},ms);}
 function reconcile(){
  if(!active()||!isVisible())return;
  if(loading){reconcileAgain=true;return;}
  if(reconcileTimer===null)reconcileTimer=setTimer(()=>{reconcileTimer=null;void refresh();},Math.max(0,3000-(now()-lastRequest)));
 }
 function stopStream(){stream?.close();stream=null;streamRevision=null;live=false;}
 function failAccess(message){halted=true;cancelTimers();abort?.abort();stopStream();state.close();onPage(null);onLoading(false);onError(message);}
 function connect(revision){
  if(!active()||stream||typeof EventSourceClass!=='function')return;
  const params=new URLSearchParams({cursor:String(state.getCursor())});if(filterId){params.set('filterId',filterId);params.set('filterRevision',revision);}
  const source=new EventSourceClass(`/api/finder/stream?${params}`);stream=source;streamRevision=revision;
  const current=()=>active()&&stream===source;
  source.addEventListener('open',()=>{if(current()){live=true;schedule(Math.max(0,30000-(now()-lastRequest)));}});
  source.addEventListener('error',()=>{if(current()){if(source.readyState===2)stopStream();else live=false;schedule(3000);}});
  source.addEventListener('change',event=>{if(!current())return;try{state.change(Number(event.lastEventId),JSON.parse(event.data));}catch{reconcile();}});
  source.addEventListener('reset',()=>{
   if(!current())return;
   halted=true;cancelTimers();abort?.abort();stopStream();state.close();onPage(null);onLoading(true);
   // Let the shared 750 ms snapshot expire before opening the edited filter.
   // Selection disposal also cancels this delayed reset.
   timer=setTimer(()=>{timer=null;if(!closed)onReset();},1000);
  });
  source.addEventListener('access-revoked',()=>{if(current())failAccess('Your session ended. Please sign in again.');});
 }
 async function refresh(){
  if(!active()||loading)return;
  if(!isVisible()){schedule(30000);return;}
  cancelTimers();loading=true;onLoading(true);onError('');lastRequest=now();abort=new AbortController();const requestAbort=abort;
  try{
   const params=new URLSearchParams({offset:String(offset)});if(filterId)params.set('filterId',filterId);
   const response=await fetcher(`/api/finder?${params}`,{cache:'no-store',signal:requestAbort.signal}),page=await response.json();
   if(!active()||requestAbort.signal.aborted)return;
   if(!response.ok){
    if([401,403].includes(response.status)){failAccess(page.error||'Your session ended. Please sign in again.');return;}
    if(filterId&&[404,409].includes(response.status)){failAccess(page.error||'This saved filter is unavailable. Choose another filter.');return;}
    throw Error(page.error||'Finder could not load cars.');
   }
   if((page.selectedFilter?.id||null)!==filterId)throw Error('Finder returned a different saved filter. Please try again.');
   const revision=finderFilterRevision(page.filterRevision,filterId);
   if(snapshotRevision!==undefined&&snapshotRevision!==revision){stopStream();state.close();state=makeState();}
   snapshotRevision=revision;
   state.snapshot(page);if(Number.isSafeInteger(page.changeCursor))connect(revision);
   schedule(Math.max(0,(live?30000:3000)-(now()-lastRequest)));
  }catch(error){if(active()&&!requestAbort.signal.aborted){onError(error.message||'Finder could not load cars.');schedule(10000);}}
  finally{if(!closed){loading=false;onLoading(false);if(reconcileAgain){reconcileAgain=false;reconcile();}}}
 }
 function dispose(){if(closed)return;closed=true;cancelTimers();abort?.abort();stopStream();state.close();}
 return {refresh,dispose,isHalted:()=>halted};
}
