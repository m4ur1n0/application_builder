'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, clearToken } from '@/lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/');
    }
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b bg-gray-50 px-6 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex gap-6">
            <Link href="/cover-letter" className="hover:underline">
              Cover Letter
            </Link>
            <Link href="/contributions" className="hover:underline">
              Contributions
            </Link>
            <Link href="/account" className="hover:underline">
              Account
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}
