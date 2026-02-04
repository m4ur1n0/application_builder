'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { clearAuth } from '@/lib/auth';
import { AuthGate, useAuth } from '@/components/AuthGate';

function AppContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  const navItems = [
    { href: '/cover-letter', label: 'Cover Letter' },
    { href: '/contributions', label: 'Contributions' },
    { href: '/account', label: 'Account' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Signal & Static: Technical, minimal navigation */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-8">
            {/* Wordmark with subtle mono font styling */}
            <div className="font-mono text-sm font-medium text-stone-900 tracking-tight">
              APPLICATION_BUILDER
            </div>

            {/* Navigation links with status dot indicator */}
            <div className="flex gap-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      px-3 py-1.5 text-xs font-medium tracking-wide uppercase transition-all
                      ${isActive
                        ? 'text-cyan-700 bg-cyan-50'
                        : 'text-stone-600 hover:text-cyan-600 hover:bg-stone-50'
                      }
                    `}
                  >
                    <span className="flex items-center gap-1.5">
                      {isActive && <span className="status-dot status-dot-active" />}
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User email with telemetry styling */}
            {user && (
              <span className="text-xs text-stone-500 hidden sm:inline font-mono">
                {user.email}
              </span>
            )}

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-stone-600 hover:text-red-600 px-3 py-1.5 hover:bg-red-50 transition-all uppercase tracking-wide"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main content with signal ruler at top */}
      <main className="flex-1 py-8 px-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
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
