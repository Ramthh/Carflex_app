export function finderSearchQuery(value){
 if(value===null||value===undefined)return '';
 if(typeof value!=='string')throw Error('Enter a valid car search.');
 const query=value.trim().replace(/\s+/g,' ');
 if(query.length>200||/[\u0000-\u0008\u000e-\u001f\u007f]/.test(query))throw Error('Search must be 200 characters or fewer.');
 return query;
}
export function finderSearchParams(params,name='q'){
 if(params.getAll(name).length>1)throw Error('Use one car search per request.');
 return finderSearchQuery(params.get(name));
}
export function finderSelectionUrl(current,{filterId,q}){
 const url=new URL(current);url.searchParams.set('finderFilter',filterId||'all');
 const query=finderSearchQuery(q);if(query)url.searchParams.set('finderSearch',query);else url.searchParams.delete('finderSearch');
 return url;
}
