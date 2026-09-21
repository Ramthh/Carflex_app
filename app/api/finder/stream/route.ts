import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth-options';
import db from '@/lib/db.postgres';
import {finderCursor,proxyFinderStream} from '@/lib/finder-stream.mjs';
import {finderFilterId,finderFilterRevision} from '@/lib/finder-filters.mjs';
import {finderSearchParams} from '@/lib/finder-search.mjs';
import {getToken} from 'next-auth/jwt';
import {validateRadarToken} from '@/lib/workspace-auth.mjs';
import {NextRequest} from 'next/server';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){
 try{
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return Response.json({error:'Please sign in to use Carflex Finder.'},{status:401});
  const token=await getToken({req:new NextRequest(request)});
  const params=new URL(request.url).searchParams;
  if([...params.keys()].some(name=>!['cursor','filterId','filterRevision','q'].includes(name))||params.getAll('cursor').length!==1||params.getAll('filterId').length>1||params.getAll('filterRevision').length>1)return Response.json({error:'Invalid Finder stream.'},{status:400});
  let cursor;try{cursor=Math.max(finderCursor(params.get('cursor')),request.headers.has('Last-Event-ID')?finderCursor(request.headers.get('Last-Event-ID')):0);}catch{return Response.json({error:'Invalid Finder cursor.'},{status:400});}
  let filterId,filterRevision;try{filterId=finderFilterId(params.get('filterId'));filterRevision=finderFilterRevision(params.get('filterRevision'),filterId);}catch{return Response.json({error:'Choose a valid saved filter and reload its results.'},{status:400});}
  let q;try{q=finderSearchParams(params);}catch{return Response.json({error:'Use one search of 200 characters or fewer.'},{status:400});}
  const authorize=async()=>{
   if(Date.parse(session.expires)<=Date.now())return false;
   return await validateRadarToken(token,{db});
  };
  return await proxyFinderStream({request,key:process.env.CARFLEX_FINDER_API_KEY,cursor,filterId,filterRevision,q,authorize});
 }catch{return Response.json({error:'Finder live updates are temporarily unavailable.'},{status:503});}
}
