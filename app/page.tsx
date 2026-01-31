'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, setToken } from '@/lib/auth';
import { requestMagicLink, consumeToken } from '@/lib/api';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [magicLink, setMagicLink] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [message, setMessage] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const existingToken = getToken();
    if (existingToken) {
      // User is already authenticated, redirect to cover-letter page
      setIsRedirecting(true);
      router.push('/cover-letter');
    }
  }, [router]);

  const handleRequestMagicLink = async () => {
    setMessage('');
    const result = await requestMagicLink(email);
    if (result.ok && result.data) {
      setMagicLink(result.data.magic_link);
      setMessage(`Magic link received: ${result.data.magic_link}`);
      // Extract token from magic link
      try {
        const url = new URL(result.data.magic_link);
        const extractedToken = url.searchParams.get('token');
        if (extractedToken) {
          setTokenInput(extractedToken);
        }
      } catch (e) {
        console.error('Failed to parse magic link:', e);
      }
    } else {
      setMessage(`Error: ${result.error}`);
    }
  };

  const handleConsumeToken = async () => {
    setMessage('');
    const result = await consumeToken(tokenInput);
    if (result.ok && result.data) {
      setToken(result.data.token);
      setIsRedirecting(true);
      setMessage('Successfully authenticated! Redirecting...');
      // Redirect to cover-letter page
      setTimeout(() => {
        router.push('/cover-letter');
      }, 500);
    } else {
      setMessage(`Error: ${result.error}`);
    }
  };

  // Don't render auth form if user is already authenticated
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Login</h1>

        <div className="mb-4 p-4 border rounded">
          <h2 className="font-semibold mb-3">Step 1: Request Magic Link</h2>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRequestMagicLink()}
            className="border p-2 w-full mb-2"
          />
          <button
            onClick={handleRequestMagicLink}
            className="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600"
          >
            Request Magic Link
          </button>
        </div>

        {magicLink && (
          <div className="mb-4 p-4 border rounded bg-gray-50">
            <h2 className="font-semibold mb-3">Step 2: Consume Token</h2>
            <p className="text-xs mb-2 break-all text-gray-600">
              Magic Link: {magicLink}
            </p>
            <input
              type="text"
              placeholder="Token (auto-extracted)"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConsumeToken()}
              className="border p-2 w-full mb-2"
            />
            <button
              onClick={handleConsumeToken}
              className="bg-green-500 text-white px-4 py-2 rounded w-full hover:bg-green-600"
            >
              Consume Link
            </button>
          </div>
        )}

        {message && (
          <div className="mt-4 p-4 border rounded bg-yellow-50">
            <pre className="whitespace-pre-wrap text-sm">{message}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
