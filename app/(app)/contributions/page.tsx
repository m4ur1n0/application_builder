'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listContributions } from '@/lib/api';
import type { Contribution } from '@/lib/types';

interface JobGroup {
  job_title: string;
  count: number;
  mostRecent: string;
}

export default function ContributionsPage() {
  const router = useRouter();
  const [jobGroups, setJobGroups] = useState<JobGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');

  const fetchAndGroupContributions = async () => {
    setLoading(true);
    setError('');

    // Fetch all contributions (use a large limit to get all)
    const result = await listContributions(1000, 0);

    if (result.ok && result.data) {
      const contributions = result.data.items;

      // Group by job_title
      const groups = new Map<string, Contribution[]>();

      contributions.forEach((contrib) => {
        const jobTitle = contrib.job_title || 'Uncategorized';
        if (!groups.has(jobTitle)) {
          groups.set(jobTitle, []);
        }
        groups.get(jobTitle)!.push(contrib);
      });

      // Convert to JobGroup array
      const groupsArray: JobGroup[] = Array.from(groups.entries()).map(([job_title, contribs]) => {
        // Sort by created_at to find most recent
        const sorted = [...contribs].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return {
          job_title,
          count: contribs.length,
          mostRecent: sorted[0].created_at,
        };
      });

      // Sort by most recent
      groupsArray.sort((a, b) =>
        new Date(b.mostRecent).getTime() - new Date(a.mostRecent).getTime()
      );

      setJobGroups(groupsArray);
    } else {
      setError(result.error || 'Failed to fetch contributions');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAndGroupContributions();
  }, []);

  const handleNavigateToJob = (jobTitle: string) => {
    router.push(`/contributions/${encodeURIComponent(jobTitle)}`);
  };

  const handleNewJob = () => {
    if (newJobTitle.trim()) {
      router.push(`/contributions/${encodeURIComponent(newJobTitle.trim())}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Contributions by Job</h1>
        <button
          onClick={fetchAndGroupContributions}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
        >
          Refresh
        </button>
      </div>

      {/* New Job Input */}
      <div className="border rounded p-4 bg-gray-50">
        <h2 className="font-semibold mb-2">Start New Job</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter job title (e.g., Software Engineer at Acme)"
            value={newJobTitle}
            onChange={(e) => setNewJobTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNewJob()}
            className="border p-2 flex-1"
          />
          <button
            onClick={handleNewJob}
            disabled={!newJobTitle.trim()}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            Go
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && <p className="text-gray-500">Loading contributions...</p>}

      {/* Error State */}
      {error && (
        <div className="border border-red-300 bg-red-50 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Job Groups List */}
      {!loading && !error && jobGroups.length === 0 && (
        <p className="text-gray-500">
          No contributions yet. Create one by entering a job title above.
        </p>
      )}

      {!loading && jobGroups.length > 0 && (
        <div className="space-y-3">
          {jobGroups.map((group) => (
            <div
              key={group.job_title}
              onClick={() => handleNavigateToJob(group.job_title)}
              className="border rounded p-4 hover:bg-gray-50 cursor-pointer transition"
            >
              <h3 className="font-semibold text-lg">{group.job_title}</h3>
              <div className="text-sm text-gray-600 mt-1">
                <span>{group.count} contribution{group.count !== 1 ? 's' : ''}</span>
                <span className="mx-2">•</span>
                <span>
                  Last updated: {new Date(group.mostRecent).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
