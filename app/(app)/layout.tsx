'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearAuth } from '@/lib/auth';
import { AuthGate, useAuth } from '@/components/AuthGate';

function AppContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-8">
            <div className="font-semibold text-lg text-gray-900">
              Application Builder
            </div>
            <div className="flex gap-1">
              <Link
                href="/cover-letter"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              >
                Cover Letter
              </Link>
              <Link
                href="/contributions"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              >
                Contributions
              </Link>
              <Link
                href="/account"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              >
                Account
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-700 hover:text-red-600 px-3 py-2 rounded-md hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="flex-1 py-8 px-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppContent>{children}</AppContent>
    </AuthGate>
  );
}
