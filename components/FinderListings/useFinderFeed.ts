'use client';
import {useEffect,useRef,useState} from 'react';
import {useSession} from 'next-auth/react';
import {createFinderController} from '@/lib/finder-controller.mjs';
import {finderFilterId,finderSelection} from '@/lib/finder-filters.mjs';
import {finderSearchParams,finderSearchQuery,finderSelectionUrl} from '@/lib/finder-search.mjs';
import {FINDER_PREFERENCE_EVENT,finderPreferenceKey,initialFinderSelection,readFinderPreference,writeFinderPreference} from '@/lib/finder-preference.mjs';
export type SavedFilter={id:string;name:string;sort:string;available:boolean;unavailableReason?:string};
type Catalog={items:SavedFilter[];defaultId:string|null};
export function useFinderFeed<T>({beforePage,enabled=true,shareSavedFilter=true,readSearchFromUrl=true}:{beforePage:(page:T|null)=>void;enabled?:boolean;shareSavedFilter?:boolean;readSearchFromUrl?:boolean}){
 const {data:session,status:sessionStatus}=useSession();
 const preferenceKey=shareSavedFilter?finderPreferenceKey(session?.user?.id):null,ready=!shareSavedFilter||sessionStatus!=='loading';
 const [page,setPage]=useState<T|null>(null),[offset,setOffset]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [catalog,setCatalog]=useState<Catalog|null>(null),[filtersLoading,setFiltersLoading]=useState(true),[filtersError,setFiltersError]=useState(''),[catalogRevision,setCatalogRevision]=useState(0);
 const [filterId,setFilterId]=useState<string|undefined>(undefined),[scopeRevision,setScopeRevision]=useState(0);
 const [searchText,setSearchText]=useState(''),[searchQuery,setSearchQuery]=useState('');
 const controller=useRef<ReturnType<typeof createFinderController>|null>(null),selection=useRef<string|undefined>(undefined),before=useRef(beforePage);before.current=beforePage;
 const selectionOwner=useRef<string|null|undefined>(undefined);
 const publish=(value:T|null)=>{before.current(value);setPage(value);};
 const readShared=()=>{try{return readFinderPreference(window.localStorage,preferenceKey);}catch{return undefined;}};
 const rememberFilter=(id:string)=>{try{if(writeFinderPreference(window.localStorage,preferenceKey,id))window.dispatchEvent(new CustomEvent(FINDER_PREFERENCE_EVENT,{detail:{key:preferenceKey}}));}catch{/* Storage may be disabled; the current selection still works. */}};
 useEffect(()=>{
  if(!enabled||!ready||selectionOwner.current!==preferenceKey){
   controller.current?.dispose();controller.current=null;selection.current=undefined;selectionOwner.current=preferenceKey;
   publish(null);setCatalog(null);setFilterId(undefined);setOffset(0);setError('');setSearchText('');setSearchQuery('');setFiltersError('');
  }
  if(!enabled||!ready){setLoading(false);setFiltersLoading(false);return;}
  const abort=new AbortController();setFiltersLoading(true);setFiltersError('');
  fetch('/api/finder/filters',{cache:'no-store',signal:abort.signal}).then(async response=>{const body=await response.json();if(!response.ok)throw Error(body.error||'Saved filters could not load.');return body as Catalog;}).then(data=>{
   if(abort.signal.aborted)return;
   setCatalog(data);
   if(selection.current===undefined){
    const params=new URL(window.location.href).searchParams;
    const query=readSearchFromUrl?finderSearchParams(params,'finderSearch'):'';setSearchText(query);setSearchQuery(query);
    const next=initialFinderSelection(data,params,readShared());selection.current=next.id;setFilterId(next.id);rememberFilter(next.id);
   }
  }).catch(reason=>{if(!abort.signal.aborted)setFiltersError(reason.message||'Saved filters could not load.');}).finally(()=>{if(!abort.signal.aborted)setFiltersLoading(false);});
  return()=>abort.abort();
 },[catalogRevision,enabled,ready,preferenceKey,readSearchFromUrl]);
 const rememberSearch=(query:string)=>{if(readSearchFromUrl)window.history.replaceState(window.history.state,'',finderSelectionUrl(window.location.href,{filterId:selection.current,q:query}));};
 useEffect(()=>{
  if(!preferenceKey||!enabled||!ready)return;
  const changed=(event:Event)=>{
   const key=event instanceof StorageEvent?event.key:(event as CustomEvent).detail?.key;
   // Initialization must apply the URL search and explicit filter together.
   // It reads the latest preference after the catalog arrives, so events
   // during that read must not mark the selection initialized prematurely.
   if(key!==preferenceKey||selection.current===undefined)return;
   const id=readShared();if(id===undefined||id===selection.current)return;
   controller.current?.dispose();controller.current=null;publish(null);setLoading(true);setError('');setOffset(0);
   selection.current=id;setFilterId(id);setScopeRevision(n=>n+1);rememberSearch(finderSearchQuery(searchText));
  };
  window.addEventListener('storage',changed);window.addEventListener(FINDER_PREFERENCE_EVENT,changed);
  return()=>{window.removeEventListener('storage',changed);window.removeEventListener(FINDER_PREFERENCE_EVENT,changed);};
 },[preferenceKey,enabled,ready,searchText,readSearchFromUrl]);
 const searchPending=finderSearchQuery(searchText)!==searchQuery;
 useEffect(()=>{
  if(!enabled||filterId===undefined||!searchPending)return;
  const timer=setTimeout(()=>{const query=finderSearchQuery(searchText);setOffset(0);setSearchQuery(query);rememberSearch(query);},350);
  return()=>clearTimeout(timer);
 },[searchText,searchQuery,filterId,searchPending,enabled]);
 const selectionError=catalog&&filterId!==undefined?finderSelection(catalog,filterId).error:'';
 useEffect(()=>{
  if(!enabled||!ready||selection.current===undefined||filterId===undefined||!catalog||searchPending)return;
  controller.current?.dispose();publish(null);setError('');
  if(selectionError){setLoading(false);setError(selectionError);return;}
  const next=createFinderController({filterId:filterId||null,offset,q:searchQuery,onPage:publish,onLoading:setLoading,onError:setError,isVisible:()=>document.visibilityState==='visible',onReset:()=>{setOffset(0);setScopeRevision(n=>n+1);setCatalogRevision(n=>n+1);}});controller.current=next;
  void next.refresh();
  const visible=()=>{if(document.visibilityState==='visible')void next.refresh();};document.addEventListener('visibilitychange',visible);
  return()=>{next.dispose();document.removeEventListener('visibilitychange',visible);if(controller.current===next)controller.current=null;};
 },[filterId,offset,scopeRevision,selectionError,!!catalog,searchQuery,searchPending,enabled,ready,preferenceKey]);
 const changeSearch=(value:string)=>{
  let query:string;try{query=finderSearchQuery(value);}catch{setError('Search must be 200 characters or fewer.');return;}
  setSearchText(value);
  if(query===searchQuery)return;
  controller.current?.dispose();controller.current=null;publish(null);setLoading(true);setError('');setOffset(0);
 };
 const submitSearch=(value=searchText)=>{
  const query=finderSearchQuery(value);controller.current?.dispose();controller.current=null;publish(null);setLoading(true);setError('');setOffset(0);setSearchText(value);setSearchQuery(query);setScopeRevision(n=>n+1);rememberSearch(query);
 };
 const chooseFilter=(id:string)=>{
  if(id!=='')finderFilterId(id);
  controller.current?.dispose();controller.current=null;publish(null);setLoading(true);setError('');setOffset(0);selection.current=id;setFilterId(id);setScopeRevision(n=>n+1);
  const query=finderSearchQuery(searchText);setSearchQuery(query);rememberSearch(query);rememberFilter(id);
 };
 const refresh=()=>{if(controller.current&&!controller.current.isHalted())void controller.current.refresh();else{setScopeRevision(n=>n+1);setCatalogRevision(n=>n+1);}};
 const currentScope=enabled&&ready&&selectionOwner.current===preferenceKey;
 return {page:currentScope?page:null,offset:currentScope?offset:0,setOffset,loading:enabled&&(!currentScope||loading),error:currentScope?error:'',refresh,catalog:currentScope?catalog:null,filtersLoading:enabled&&(!currentScope||filtersLoading),filtersError:currentScope?filtersError:'',filterId:currentScope?filterId:undefined,chooseFilter,searchText:currentScope?searchText:'',changeSearch,submitSearch,clearSearch:()=>submitSearch(''),retryFilters:()=>setCatalogRevision(n=>n+1)};
}
