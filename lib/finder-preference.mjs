import {finderFilterId,finderSelection} from './finder-filters.mjs';

export const FINDER_PREFERENCE_EVENT='carflex-finder-filter-changed';
export function finderPreferenceKey(userId){
 if(userId===null||userId===undefined||!String(userId).trim())return null;
 return `carflex-finder-filter:${encodeURIComponent(String(userId))}`;
}
export function decodeFinderPreference(raw){
 try{
  const value=JSON.parse(raw);
  if(value?.version!==1||typeof value.filterId!=='string')return undefined;
  return value.filterId===''?'':finderFilterId(value.filterId)??undefined;
 }catch{return undefined;}
}
export function readFinderPreference(storage,key){
 if(!key)return undefined;
 try{return decodeFinderPreference(storage.getItem(key));}catch{return undefined;}
}
export function writeFinderPreference(storage,key,id){
 if(!key||typeof id!=='string')return false;
 try{
  if(id!=='')finderFilterId(id);
  if(readFinderPreference(storage,key)===id)return false;
  storage.setItem(key,JSON.stringify({version:1,filterId:id}));return true;
 }catch{return false;}
}
export function initialFinderSelection(catalog,params,saved){
 let choice=saved;
 if(params.has('finderFilter')){
  if(params.getAll('finderFilter').length!==1)throw Error('Choose one saved filter.');
  const value=params.get('finderFilter');choice=value==='all'?'':finderFilterId(value)??undefined;
 }
 // A deleted or unavailable saved selection remains an error, never broadens
 // the inventory to All or silently replaces the user's selected filter.
 return finderSelection(catalog,choice);
}
