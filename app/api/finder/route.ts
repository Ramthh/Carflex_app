import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth-options';
import db from '@/lib/db.postgres';
import {readLiveFinderFeed} from '@/lib/finder-feed.mjs';
import {finderFilterId} from '@/lib/finder-filters.mjs';
import {finderSearchParams} from '@/lib/finder-search.mjs';

export const dynamic='force-dynamic';
export async function GET(request:Request){
 const reply=(body:unknown,status:number)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
 try{
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return reply({error:'Please sign in to use Carflex Finder.'},401);
  const current=await db.query('SELECT token_version FROM "User" WHERE id=$1',[session.user.id]);
  if(!current.rows[0]||(current.rows[0].token_version??0)!==session.user.tokenVersion)return reply({error:'Your session ended. Please sign in again.'},401);
  const params=new URL(request.url).searchParams;
  if([...params.keys()].some(name=>!['offset','filterId','q'].includes(name))||params.getAll('offset').length>1||params.getAll('filterId').length>1)return reply({error:'Only Finder page, saved filter and search are supported.'},400);
  const raw=params.get('offset')??'0';if(!/^\d{1,8}$/.test(raw))return reply({error:'Invalid Finder page.'},400);
  let filterId;try{filterId=finderFilterId(params.get('filterId'));}catch{return reply({error:'Choose a valid saved filter.'},400);}
  let q;try{q=finderSearchParams(params);}catch{return reply({error:'Use one search of 200 characters or fewer.'},400);}
  const result=await readLiveFinderFeed({key:process.env.CARFLEX_FINDER_API_KEY,offset:Number(raw),filterId,q});
  return reply(result.body,result.status);
 }catch{return reply({error:'Carflex Finder is temporarily unavailable.'},503);}
}
