export interface Company {
  company_id: string;
  user_id: string;
  company_name: string;
  position: string;
  created_at: string;
}

export interface CompanyCreate {
  companyName: string;
  position: string;
}

export interface CompaniesResponse {
  ok: true;
  companies: Company[];
}

export interface Contribution {
  id: string;
  company_id: string;
  title: string;
  context: string | null;
  actions: string | null;
  impact: string | null;
  metrics: string | null;
  contribution_date: string | null;
  job_title: string | null;
  created_at: string;
}

export interface ContributionCreate {
  title: string;
  company_id?: string; // Required for POST /contributions, not needed for POST /companies/{id}/contributions
  context?: string;
  actions?: string;
  impact?: string;
  metrics?: string;
  contribution_date?: string;
  job_title?: string;
}

export interface ContributionsResponse {
  ok: true;
  items: Contribution[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface UploadedFile {
  key: string;
  filename: string;
  kind: 'resume' | 'about' | 'other';
  uploaded_at: string;
  url?: string;
}

export interface FilesResponse {
  ok: true;
  files: UploadedFile[];
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface GenerateCoverLetterRequest {
  fileIds?: string[];
  texts: {
    resume: string;
    job: string;
    extra?: string;
  };
  instructions?: string;
  model?: string;
}

export interface GenerateCoverLetterResponse {
  ok: true;
  letterText: string;
  letterBlocks: string[];
  modelUsed: string;
  inputRefs: {
    fileIds: string[];
  };
}

export interface ExportCoverLetterRequest {
  coverLetterText: string;
  header: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  resumeFileId?: string;
}

export interface ScrapeJobRequest {
  url: string;
}

export interface ScrapeJobResponse {
  ok: true;
  title?: string;
  company?: string;
  location?: string;
  descriptionText: string;
  usedFallback?: boolean;
}
