"use client";
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function WorkspaceSessionBoundary({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  useEffect(() => {
    if (status === 'unauthenticated') window.location.replace('/login');
  }, [status]);
  if (status !== 'authenticated') return <div className="p-8 text-gray-500" role="status">Checking your access…</div>;
  return children;
}
