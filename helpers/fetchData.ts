import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';

// Server-rendered listing pages use the same authenticated handler locally.
// No cookies or central credentials are forwarded to a configurable URL.
const routes = {
  all: () => import('@/app/api/allCars/route'),
  autotrader: () => import('@/app/api/autotraderCars/route'),
  facebook: () => import('@/app/api/facebookCars/route'),
  kijiji: () => import('@/app/api/kijijiCars/route'),
  marketplace: () => import('@/app/api/marketplaceCars/route'),
};

export default async function fetchData({ name, limit }: { name: string; limit?: number }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  if (!Object.hasOwn(routes, name)) throw new Error('Invalid listing source');
  const handler = await routes[name as keyof typeof routes]();
  const result = await handler.GET(new Request(`https://radar.carflexplus.ca/api/${name}Cars?limit=${limit || 20}`));
  if (!result.ok) throw new Error('Failed to fetch data');
  return result.json();
}
