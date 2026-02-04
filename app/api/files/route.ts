import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const proxyBaseUrl = process.env.CLOUDFLARE_PROXY_BASE_URL;
    const internalKey = process.env.CLOUDFLARE_PROXY_INTERNAL_KEY;

    if (!proxyBaseUrl || !internalKey) {
      return NextResponse.json(
        { error: 'Proxy configuration missing' },
        { status: 500 }
      );
    }

    // Get the authorization header from the client request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
        return NextResponse.json({ error: "unauthorized, caught by site API." }, { status: 401 });
    }

    console.log("auth", authHeader)

    const response = await fetch(`https://${proxyBaseUrl}/proxy/files`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'X-Internal-Key': internalKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Proxy error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
