'use client';
import {useEffect,useRef,useState} from 'react';
import {createFinderController} from '@/lib/finder-controller.mjs';
import {finderFilterId,finderSelection} from '@/lib/finder-filters.mjs';
import {finderSearchParams,finderSearchQuery,finderSelectionUrl} from '@/lib/finder-search.mjs';
export type SavedFilter={id:string;name:string;sort:string;available:boolean;unavailableReason?:string};
type Catalog={items:SavedFilter[];defaultId:string|null};
export function useFinderFeed<T>({beforePage}:{beforePage:(page:T|null)=>void}){
 const [page,setPage]=useState<T|null>(null),[offset,setOffset]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [catalog,setCatalog]=useState<Catalog|null>(null),[filtersLoading,setFiltersLoading]=useState(true),[filtersError,setFiltersError]=useState(''),[catalogRevision,setCatalogRevision]=useState(0);
 const [filterId,setFilterId]=useState<string|undefined>(undefined),[scopeRevision,setScopeRevision]=useState(0);
 const [searchText,setSearchText]=useState(''),[searchQuery,setSearchQuery]=useState('');
 const controller=useRef<ReturnType<typeof createFinderController>|null>(null),selection=useRef<string|undefined>(undefined),before=useRef(beforePage);before.current=beforePage;
 const publish=(value:T|null)=>{before.current(value);setPage(value);};
 useEffect(()=>{
  const abort=new AbortController();setFiltersLoading(true);setFiltersError('');
  fetch('/api/finder/filters',{cache:'no-store',signal:abort.signal}).then(async response=>{const body=await response.json();if(!response.ok)throw Error(body.error||'Saved filters could not load.');return body as Catalog;}).then(data=>{
   if(abort.signal.aborted)return;
   setCatalog(data);
   if(selection.current===undefined){
    const params=new URL(window.location.href).searchParams;let choice:string|undefined;
    if(params.has('finderFilter')){const value=params.get('finderFilter');choice=value==='all'?'':finderFilterId(value)||'';}
    const query=finderSearchParams(params,'finderSearch');setSearchText(query);setSearchQuery(query);
    const next=finderSelection(data,choice);selection.current=next.id;setFilterId(next.id);
   }
  }).catch(reason=>{if(!abort.signal.aborted)setFiltersError(reason.message||'Saved filters could not load.');}).finally(()=>{if(!abort.signal.aborted)setFiltersLoading(false);});
  return()=>abort.abort();
 },[catalogRevision]);
 const rememberSearch=(query:string)=>window.history.replaceState(window.history.state,'',finderSelectionUrl(window.location.href,{filterId:selection.current,q:query}));
 const searchPending=finderSearchQuery(searchText)!==searchQuery;
 useEffect(()=>{
  if(filterId===undefined||!searchPending)return;
  const timer=setTimeout(()=>{const query=finderSearchQuery(searchText);setOffset(0);setSearchQuery(query);rememberSearch(query);},350);
  return()=>clearTimeout(timer);
 },[searchText,searchQuery,filterId,searchPending]);
 const selectionError=catalog&&filterId!==undefined?finderSelection(catalog,filterId).error:'';
 useEffect(()=>{
  if(filterId===undefined||!catalog||searchPending)return;
  controller.current?.dispose();publish(null);setError('');
  if(selectionError){setLoading(false);setError(selectionError);return;}
  const next=createFinderController({filterId:filterId||null,offset,q:searchQuery,onPage:publish,onLoading:setLoading,onError:setError,isVisible:()=>document.visibilityState==='visible',onReset:()=>{setOffset(0);setScopeRevision(n=>n+1);setCatalogRevision(n=>n+1);}});controller.current=next;
  void next.refresh();
  const visible=()=>{if(document.visibilityState==='visible')void next.refresh();};document.addEventListener('visibilitychange',visible);
  return()=>{next.dispose();document.removeEventListener('visibilitychange',visible);if(controller.current===next)controller.current=null;};
 },[filterId,offset,scopeRevision,selectionError,!!catalog,searchQuery,searchPending]);
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
  controller.current?.dispose();controller.current=null;publish(null);setLoading(true);setError('');setOffset(0);selection.current=id;setFilterId(id);setScopeRevision(n=>n+1);
  const query=finderSearchQuery(searchText);setSearchQuery(query);rememberSearch(query);
 };
 const refresh=()=>{if(controller.current&&!controller.current.isHalted())void controller.current.refresh();else{setScopeRevision(n=>n+1);setCatalogRevision(n=>n+1);}};
 return {page,offset,setOffset,loading,error,refresh,catalog,filtersLoading,filtersError,filterId,chooseFilter,searchText,changeSearch,submitSearch,clearSearch:()=>submitSearch(''),retryFilters:()=>setCatalogRevision(n=>n+1)};
}
