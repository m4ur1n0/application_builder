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

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const response = await fetch(`https://${proxyBaseUrl}/proxy/resume`, {
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

    const blob = await response.blob();
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/pdf',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'inline',
      },
    });
  } catch (error) {
    console.error('Error in /api/resume:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
