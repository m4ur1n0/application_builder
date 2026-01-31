export interface Contribution {
  id: string;
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
