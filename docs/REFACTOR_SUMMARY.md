# Multi-Page App Refactor Summary

The single-page API test UI has been refactored into a multi-page application with the following structure:

## New Pages

### 1. `/` (Root) - Authentication
- **File**: `app/page.tsx`
- Handles magic link authentication flow
- Redirects authenticated users to `/cover-letter`
- Shows login form for unauthenticated users

### 2. `/cover-letter` - Cover Letter Creator
- **File**: `app/(app)/cover-letter/page.tsx`
- **Features**:
  - Job context input (link or paste description)
  - Cover letter editor (textarea styled like a document)
  - Generate button (stub, TODO: LLM integration)
  - Download button (stub, TODO: PDF generation)
- **TODOs**:
  - `handleFetchJobData()`: Implement job link scraping
  - `handleGenerateCoverLetter()`: Integrate LLM for cover letter generation
  - `handleDownload()`: Implement PDF download functionality

### 3. `/contributions` - Contributions Landing
- **File**: `app/(app)/contributions/page.tsx`
- **Features**:
  - Groups contributions by `job_title`
  - Shows count and most recent date per job
  - "New Job" input to create contributions for a new job
  - Navigates to `/contributions/[job]` when clicking a job
- **Note**: Fetches all contributions and groups client-side

### 4. `/contributions/[job]` - Job-Specific Contributions
- **File**: `app/(app)/contributions/[job]/page.tsx`
- **Features**:
  - Lists contributions for a specific job (filtered client-side)
  - Add new contribution form (prefills job_title)
  - Edit contributions inline (DELETE + POST pattern, no PUT endpoint)
  - Delete contributions
  - Back button to return to landing page

### 5. `/account` - Account & File Management
- **File**: `app/(app)/account/page.tsx`
- **Features**:
  - Upload resume (PDF/DOC/DOCX)
  - Upload about/projects (textarea → .txt or file upload)
  - Display uploaded files (resume, about, other)
  - Fetches files via Cloudflare proxy worker
- **Dependencies**: Requires environment variables:
  - `NEXT_PUBLIC_CLOUDFLARE_PROXY_BASE_URL`
  - `NEXT_PUBLIC_CLOUDFLARE_PROXY_INTERNAL_KEY`

## Shared Layout

### `app/(app)/layout.tsx`
- Navigation bar with links to: Cover Letter, Contributions, Account
- Logout button (clears token and redirects to `/`)
- Auth guard: redirects to `/` if no token found

## Database Changes

### Migration Required
- **File**: `docs/migrations/001_add_job_title.sql`
- **Action**: Run this SQL in your D1 console
- **Purpose**: Adds `job_title` column to contributions table

### Worker Changes Required
- **File**: `docs/worker_patch.md`
- **Action**: Apply the changes described to your Cloudflare Worker
- **Changes**:
  1. Accept `job_title` in POST /contributions
  2. Store `job_title` in database
  3. Return `job_title` in GET /contributions

## Updated Files

### `lib/types.ts`
- Added `job_title: string | null` to `Contribution` interface
- Added `job_title?: string` to `ContributionCreate` interface
- Added `UploadedFile` and `FilesResponse` interfaces for file management

### `lib/api.ts`
- Added `FilesResponse` import
- Added `getFilesViaProxy()` function for fetching files from proxy worker
- **Note**: Proxy endpoint assumed to exist; clear TODOs in code if not configured

### `lib/auth.ts`
- No changes (reused as-is)

## Environment Variables

Ensure these are set in `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-worker.workers.dev
NEXT_PUBLIC_CLOUDFLARE_PROXY_BASE_URL=https://your-proxy-worker.workers.dev
NEXT_PUBLIC_CLOUDFLARE_PROXY_INTERNAL_KEY=your-internal-key
```

## Key TODOs (Marked in Code)

### Cover Letter Page
1. **Job Link Scraping**: Implement scraping logic in `handleFetchJobData()`
2. **LLM Generation**: Integrate LLM API in `handleGenerateCoverLetter()`
3. **PDF Download**: Implement PDF generation in `handleDownload()`

### Account Page
- File proxy endpoint may need configuration
- Clear error messages guide user if proxy is unavailable

### Worker
- Apply changes from `docs/worker_patch.md`
- Run migration from `docs/migrations/001_add_job_title.sql`

## Testing

1. **Run migration**: Execute `docs/migrations/001_add_job_title.sql` in D1 console
2. **Update worker**: Apply changes from `docs/worker_patch.md`
3. **Set environment variables**: Configure all required env vars
4. **Start dev server**: `npm run dev`
5. **Test flow**:
   - Login at `/`
   - Navigate to `/cover-letter`
   - Navigate to `/contributions`
   - Create a new job contribution
   - Edit/delete contributions
   - Upload files at `/account`

## Build Status

✅ All files compile successfully
✅ No TypeScript errors
✅ Routes properly configured

## Architecture Notes

- Uses App Router with route groups `(app)` for authenticated pages
- Auth is handled client-side with localStorage (existing pattern preserved)
- All API calls go through `lib/api.ts` helpers
- No new dependencies added
- Styling kept minimal (functional, not polished)
