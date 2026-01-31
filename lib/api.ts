import { getToken } from './auth';
import type { ApiResponse, ContributionCreate, ContributionsResponse, FilesResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function getHeaders(includeAuth: boolean = true): HeadersInit {
  const headers: HeadersInit = {};

  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        error: `HTTP ${response.status}: ${errorText || response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Auth endpoints
export async function requestMagicLink(email: string): Promise<ApiResponse<{ magic_link: string }>> {
  try {
    const response = await fetch(buildUrl('/auth/request-link'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function consumeToken(token: string): Promise<ApiResponse<{ ok: true; token: string }>> {
  try {
    const response = await fetch(buildUrl(`/auth/consume?token=${encodeURIComponent(token)}`), {
      method: 'GET',
    });
    return handleResponse(response);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Upload endpoint
export async function uploadFile(
  kind: 'resume' | 'about' | 'other',
  file: File
): Promise<ApiResponse<{ ok: true; key: string }>> {
  try {
    const formData = new FormData();
    formData.append('kind', kind);
    formData.append('file', file);

    const response = await fetch(buildUrl('/upload'), {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
    return handleResponse(response);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Contributions endpoints
export async function createContribution(
  contribution: ContributionCreate
): Promise<ApiResponse<{ ok: true }>> {
  try {
    const response = await fetch(buildUrl('/contributions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders(true),
      },
      body: JSON.stringify(contribution),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function listContributions(
  limit: number = 25,
  offset: number = 0
): Promise<ApiResponse<ContributionsResponse>> {
  try {
    const response = await fetch(
      buildUrl(`/contributions?limit=${limit}&offset=${offset}`),
      {
        method: 'GET',
        headers: getHeaders(true),
      }
    );
    return handleResponse(response);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function deleteContribution(id: string): Promise<ApiResponse<{ ok: true }>> {
  try {
    const response = await fetch(buildUrl(`/contributions/${id}`), {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Files endpoint via proxy worker
export async function getFilesViaProxy(): Promise<ApiResponse<FilesResponse>> {
  try {
    // TODO: Ensure environment variables are configured:
    // - NEXT_PUBLIC_CLOUDFLARE_PROXY_BASE_URL
    // - NEXT_PUBLIC_CLOUDFLARE_PROXY_INTERNAL_KEY
    const proxyBaseUrl = process.env.CLOUDFLARE_PROXY_BASE_URL;
    const internalKey = process.env.CLOUDFLARE_PROXY_INTERNAL_KEY;

    if (!proxyBaseUrl || !internalKey) {
      return {
        ok: false,
        error: 'Proxy configuration missing. Set NEXT_PUBLIC_CLOUDFLARE_PROXY_BASE_URL and NEXT_PUBLIC_CLOUDFLARE_PROXY_INTERNAL_KEY',
      };
    }

    const token = getToken();
    const response = await fetch(`${proxyBaseUrl}/proxy/files`, {
      method: 'GET',
      headers: {
        'X-Internal-Key': internalKey,
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    return handleResponse(response);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
