'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken, setCachedUser, clearAuth } from '@/lib/auth';
import { getMe } from '@/lib/api';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setError('No token provided in callback URL');
        return;
      }

      // Store the session token
      setToken(token);

      // Validate the token with the server
      const result = await getMe();

      if (result.ok && result.data) {
        // Token is valid, cache user data
        setCachedUser(result.data.user);

        // Redirect to cover-letter page
        router.push('/cover-letter');
      } else {
        // Token validation failed
        clearAuth();
        setError(result.error || 'Failed to validate session');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-full max-w-md p-8 bg-white border border-stone-300">
          <div className="telemetry-row mb-6 pb-3 border-b border-stone-200">
            <div className="telemetry-item">
              <span className="status-dot status-dot-error" />
              <span>AUTH_ERROR</span>
            </div>
          </div>
          <h1 className="text-xl font-medium text-red-600 mb-4">Authentication Failed</h1>
          <p className="text-sm text-stone-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-cyan-600 text-white px-4 py-2 text-sm border border-cyan-700 hover:bg-cyan-700 w-full transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-cyan-600 border-t-transparent mb-4"></div>
        <p className="text-sm text-stone-600">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-cyan-600 border-t-transparent mb-4"></div>
            <p className="text-sm text-stone-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
