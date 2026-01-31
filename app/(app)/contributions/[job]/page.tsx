'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { listContributions, createContribution, deleteContribution } from '@/lib/api';
import type { Contribution, ContributionCreate } from '@/lib/types';

export default function JobContributionsPage() {
  const params = useParams();
  const router = useRouter();
  const jobTitle = decodeURIComponent(params.job as string);

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<ContributionCreate>({
    title: '',
    context: '',
    actions: '',
    impact: '',
    metrics: '',
    contribution_date: '',
    job_title: jobTitle,
  });

  const fetchContributions = useCallback(async () => {
    setLoading(true);
    setError('');

    const result = await listContributions(1000, 0);

    if (result.ok && result.data) {
      // Filter by job_title client-side
      const filtered = result.data.items.filter(
        (contrib) => (contrib.job_title || 'Uncategorized') === jobTitle
      );
      setContributions(filtered);
    } else {
      setError(result.error || 'Failed to fetch contributions');
    }

    setLoading(false);
  }, [jobTitle]);

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    const payload: ContributionCreate = {
      title: formData.title,
      job_title: jobTitle,
    };
    if (formData.context?.trim()) payload.context = formData.context;
    if (formData.actions?.trim()) payload.actions = formData.actions;
    if (formData.impact?.trim()) payload.impact = formData.impact;
    if (formData.metrics?.trim()) payload.metrics = formData.metrics;
    if (formData.contribution_date?.trim()) payload.contribution_date = formData.contribution_date;

    const result = await createContribution(payload);

    if (result.ok) {
      // Reset form
      setFormData({
        title: '',
        context: '',
        actions: '',
        impact: '',
        metrics: '',
        contribution_date: '',
        job_title: jobTitle,
      });
      setEditingId(null);
      fetchContributions();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contribution?')) return;

    const result = await deleteContribution(id);
    if (result.ok) {
      fetchContributions();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleEdit = (contrib: Contribution) => {
    setEditingId(contrib.id);
    setFormData({
      title: contrib.title,
      context: contrib.context || '',
      actions: contrib.actions || '',
      impact: contrib.impact || '',
      metrics: contrib.metrics || '',
      contribution_date: contrib.contribution_date || '',
      job_title: jobTitle,
    });
  };

  const handleSaveEdit = async (oldId: string) => {
    // DELETE then POST (no PUT endpoint)
    await deleteContribution(oldId);
    await handleSubmit();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      title: '',
      context: '',
      actions: '',
      impact: '',
      metrics: '',
      contribution_date: '',
      job_title: jobTitle,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/contributions')}
          className="text-blue-600 hover:underline"
        >
          ← Back to all jobs
        </button>
      </div>

      <h1 className="text-2xl font-bold">{jobTitle}</h1>

      {/* Contribution Form */}
      <div className="border rounded p-4 bg-gray-50">
        <h2 className="font-semibold mb-4">
          {editingId ? 'Edit Contribution' : 'Add New Contribution'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title (required)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="border p-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Context</label>
            <textarea
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              className="border p-2 w-full h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Actions</label>
            <textarea
              value={formData.actions}
              onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
              className="border p-2 w-full h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Impact</label>
            <textarea
              value={formData.impact}
              onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
              className="border p-2 w-full h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Metrics</label>
            <textarea
              value={formData.metrics}
              onChange={(e) => setFormData({ ...formData, metrics: e.target.value })}
              className="border p-2 w-full h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contribution Date</label>
            <input
              type="date"
              value={formData.contribution_date}
              onChange={(e) =>
                setFormData({ ...formData, contribution_date: e.target.value })
              }
              className="border p-2"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {editingId ? (
            <>
              <button
                onClick={() => handleSaveEdit(editingId)}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelEdit}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleSubmit}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Add Contribution
            </button>
          )}
        </div>
      </div>

      {/* Loading/Error States */}
      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Contributions List */}
      {!loading && contributions.length === 0 && (
        <p className="text-gray-500">No contributions yet for this job.</p>
      )}

      {!loading && contributions.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">
            {contributions.length} Contribution{contributions.length !== 1 ? 's' : ''}
          </h2>

          {contributions.map((contrib) => (
            <div key={contrib.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{contrib.title}</h3>
                  <p className="text-xs text-gray-500">
                    Date: {contrib.contribution_date || 'N/A'} | Created:{' '}
                    {new Date(contrib.created_at).toLocaleString()}
                  </p>

                  {contrib.context && (
                    <div className="mt-2">
                      <strong className="text-sm">Context:</strong>
                      <p className="text-sm">{contrib.context}</p>
                    </div>
                  )}

                  {contrib.actions && (
                    <div className="mt-2">
                      <strong className="text-sm">Actions:</strong>
                      <p className="text-sm">{contrib.actions}</p>
                    </div>
                  )}

                  {contrib.impact && (
                    <div className="mt-2">
                      <strong className="text-sm">Impact:</strong>
                      <p className="text-sm">{contrib.impact}</p>
                    </div>
                  )}

                  {contrib.metrics && (
                    <div className="mt-2">
                      <strong className="text-sm">Metrics:</strong>
                      <p className="text-sm">{contrib.metrics}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(contrib)}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(contrib.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
