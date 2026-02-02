'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken, setCachedUser, clearAuth } from '@/lib/auth';
import { getMe } from '@/lib/api';

export default function GoogleCallbackPage() {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Authentication Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Completing authentication...</p>
    </div>
  );
}
