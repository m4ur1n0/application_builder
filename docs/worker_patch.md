# Worker Patch: Add job_title Support to Contributions

This document describes the changes needed in the Cloudflare Worker to support the `job_title` field for contributions.

## Database Migration

First, run the migration in `docs/migrations/001_add_job_title.sql` in your D1 console.

## Worker Changes

### 1. Update Contribution Creation (POST /contributions)

**Location:** Handler for `POST /contributions`

**Changes:**
- Accept `job_title` in the request body
- Add `job_title` to the INSERT statement

**Before:**
```javascript
const { title, context, actions, impact, metrics, contribution_date } = await request.json();

const result = await db.prepare(
  `INSERT INTO contributions (id, user_id, title, context, actions, impact, metrics, contribution_date, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
).bind(
  contributionId,
  userId,
  title,
  context || null,
  actions || null,
  impact || null,
  metrics || null,
  contribution_date || null,
  new Date().toISOString()
).run();
```

**After:**
```javascript
const { title, context, actions, impact, metrics, contribution_date, job_title } = await request.json();

// Optional: Validate job_title is provided
// if (!job_title) {
//   return new Response(JSON.stringify({ error: 'job_title is required' }), {
//     status: 400,
//     headers: { 'Content-Type': 'application/json' }
//   });
// }

const result = await db.prepare(
  `INSERT INTO contributions (id, user_id, title, context, actions, impact, metrics, contribution_date, job_title, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
).bind(
  contributionId,
  userId,
  title,
  context || null,
  actions || null,
  impact || null,
  metrics || null,
  contribution_date || null,
  job_title || null,
  new Date().toISOString()
).run();
```

### 2. Update Contribution Listing (GET /contributions)

**Location:** Handler for `GET /contributions`

**Changes:**
- Include `job_title` in SELECT statement

**Before:**
```javascript
const { results } = await db.prepare(
  `SELECT id, title, context, actions, impact, metrics, contribution_date, created_at
   FROM contributions
   WHERE user_id = ?
   ORDER BY created_at DESC
   LIMIT ? OFFSET ?`
).bind(userId, limit, offset).all();
```

**After:**
```javascript
const { results } = await db.prepare(
  `SELECT id, title, context, actions, impact, metrics, contribution_date, job_title, created_at
   FROM contributions
   WHERE user_id = ?
   ORDER BY created_at DESC
   LIMIT ? OFFSET ?`
).bind(userId, limit, offset).all();
```

### 3. Update Contribution Deletion (DELETE /contributions/:id)

**No changes needed** - The DELETE operation doesn't need to reference job_title.

## TypeScript Type Updates (if using TypeScript in Worker)

```typescript
interface Contribution {
  id: string;
  user_id: string;
  title: string;
  context: string | null;
  actions: string | null;
  impact: string | null;
  metrics: string | null;
  contribution_date: string | null;
  job_title: string | null;  // ADD THIS
  created_at: string;
}

interface ContributionCreatePayload {
  title: string;
  context?: string;
  actions?: string;
  impact?: string;
  metrics?: string;
  contribution_date?: string;
  job_title?: string;  // ADD THIS
}
```

## Testing

After applying these changes:

1. Test creating a contribution with `job_title`:
```bash
curl -X POST https://your-worker.workers.dev/contributions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","job_title":"Software Engineer at Acme"}'
```

2. Test listing contributions returns `job_title`:
```bash
curl https://your-worker.workers.dev/contributions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. Verify existing contributions (without job_title) still return successfully with `job_title: null`.
