import { getToken, clearAuth } from './auth';
import type {
  ApiResponse,
  Company,
  CompanyCreate,
  CompaniesResponse,
  Contribution,
  ContributionCreate,
  ContributionsResponse,
  FilesResponse,
  User,
  GenerateCoverLetterRequest,
  GenerateCoverLetterResponse,
  ScrapeJobRequest,
  ScrapeJobResponse
} from './types';

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
      // Handle 401 globally: clear auth state
      if (response.status === 401) {
        clearAuth();
        return {
          ok: false,
          error: 'Unauthorized - please log in again',
        };
      }

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

export async function getMe(): Promise<ApiResponse<{ ok: true; user: User }>> {
  try {
    const response = await fetch(buildUrl('/auth/me'), {
      method: 'GET',
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

// Companies endpoints
export async function createCompany(
  company: CompanyCreate
): Promise<ApiResponse<{ ok: true; company: Company }>> {
  try {
    const response = await fetch(buildUrl('/companies'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders(true),
      },
      body: JSON.stringify(company),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function listCompanies(): Promise<ApiResponse<CompaniesResponse>> {
  try {
    const response = await fetch(buildUrl('/companies'), {
      method: 'GET',
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

export async function deleteCompany(companyId: string): Promise<ApiResponse<{ ok: true }>> {
  try {
    const response = await fetch(buildUrl(`/companies/${companyId}`), {
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

export async function createCompanyContribution(
  companyId: string,
  contribution: Omit<ContributionCreate, 'company_id'>
): Promise<ApiResponse<{ ok: true; contributionId: string }>> {
  try {
    const response = await fetch(buildUrl(`/companies/${companyId}/contributions`), {
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

export async function listCompanyContributions(
  companyId: string
): Promise<ApiResponse<{ ok: true; items: Contribution[]; total: number }>> {
  try {
    const response = await fetch(buildUrl(`/companies/${companyId}/contributions`), {
      method: 'GET',
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

// Files endpoint via proxy worker (now proxied through our API route)
export async function getFilesViaProxy(): Promise<ApiResponse<FilesResponse>> {
  try {
    const token = getToken();
    const response = await fetch('/api/files', {
      method: 'GET',
      headers: {
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

// Cover Letter generation endpoint
export async function generateCoverLetter(
  request: GenerateCoverLetterRequest
): Promise<ApiResponse<GenerateCoverLetterResponse>> {
  try {
    const response = await fetch(buildUrl('/api/cover-letter/generate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders(true),
      },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Job scraping endpoint
export async function scrapeJobPosting(
  url: string
): Promise<ApiResponse<ScrapeJobResponse>> {
  try {
    const response = await fetch('/api/scrape-job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
