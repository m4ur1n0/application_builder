'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    const existingToken = getToken();
    if (existingToken) {
      // User is already authenticated, redirect to cover-letter page
      router.push('/cover-letter');
    }
  }, [router]);

  const handleGoogleLogin = () => {
    // Redirect to backend OAuth start endpoint
    window.location.href = `${API_BASE_URL}/auth/google/start`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-md">
        {/* Signal & Static: Corner ticks motif on auth card */}
        <div className="bg-white border border-stone-300 p-8 corner-ticks">
          {/* Telemetry row at top */}
          <div className="telemetry-row mb-8 pb-3 border-b border-stone-200">
            <div className="telemetry-item">
              <span className="status-dot status-dot-active" />
              <span>AUTH</span>
            </div>
            <div className="telemetry-item">
              <span>SECURE</span>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-medium text-stone-900 mb-2">
              Authentication Required
            </h1>
            <p className="text-sm text-stone-600">
              Sign in with your Google account to access the application builder
            </p>
          </div>

          <Button
            onClick={handleGoogleLogin}
            variant="primary"
            size="lg"
            fullWidth
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          {/* Signal ruler at bottom */}
          <div className="signal-ruler mt-8" data-label="OAuth 2.0" />
        </div>

        <p className="text-center text-xs text-stone-500 mt-6 font-mono">
          SECURE_AUTH_v1.0 // GOOGLE_OAUTH
        </p>
      </div>
    </div>
  );
}
