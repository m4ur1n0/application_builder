'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  listCompanies,
  listCompanyContributions,
  createCompanyContribution,
  deleteContribution,
} from '@/lib/api';
import type { Company, Contribution } from '@/lib/types';
import { Button, Input, Textarea, Card, Alert } from '@/components/ui';

export default function CompanyContributionsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    context: '',
    actions: '',
    impact: '',
    metrics: '',
    contribution_date: '',
  });

  const fetchCompanyData = useCallback(async () => {
    setLoading(true);
    setError('');

    // Fetch company info
    const companiesResult = await listCompanies();
    if (companiesResult.ok && companiesResult.data) {
      const foundCompany = companiesResult.data.companies.find(
        (c) => c.company_id === companyId
      );
      if (foundCompany) {
        setCompany(foundCompany);
      } else {
        setError('Company not found');
        setLoading(false);
        return;
      }
    } else {
      setError(companiesResult.error || 'Failed to fetch company');
      setLoading(false);
      return;
    }

    // Fetch contributions for this company
    const contribResult = await listCompanyContributions(companyId);
    if (contribResult.ok && contribResult.data) {
      setContributions(contribResult.data.items);
    } else {
      setError(contribResult.error || 'Failed to fetch contributions');
    }

    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    const payload: any = {
      title: formData.title,
    };
    if (formData.context?.trim()) payload.context = formData.context;
    if (formData.actions?.trim()) payload.actions = formData.actions;
    if (formData.impact?.trim()) payload.impact = formData.impact;
    if (formData.metrics?.trim()) payload.metrics = formData.metrics;
    if (formData.contribution_date?.trim())
      payload.contribution_date = formData.contribution_date;

    const result = await createCompanyContribution(companyId, payload);

    if (result.ok) {
      // Reset form
      setFormData({
        title: '',
        context: '',
        actions: '',
        impact: '',
        metrics: '',
        contribution_date: '',
      });
      setEditingId(null);
      fetchCompanyData();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contribution?')) return;

    const result = await deleteContribution(id);
    if (result.ok) {
      fetchCompanyData();
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
    });
  };

  return (
    <div className="space-y-6">
      <Button
        onClick={() => router.push('/contributions')}
        variant="ghost"
        size="sm"
        className="mb-2"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to companies
      </Button>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {!loading && company && (
        <>
          <div className="border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-gray-900">{company.company_name}</h1>
            <p className="text-lg text-gray-600 mt-1">{company.position}</p>
          </div>

          {/* Contribution Form */}
          <Card className="bg-gray-50">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">
              {editingId ? 'Edit Contribution' : 'Add New Contribution'}
            </h2>

            <div className="space-y-4">
              <Input
                label="Title (required)"
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Brief description of your contribution"
              />

              <Textarea
                label="Context"
                value={formData.context}
                onChange={(e) =>
                  setFormData({ ...formData, context: e.target.value })
                }
                className="h-20"
                placeholder="What was the situation or challenge?"
              />

              <Textarea
                label="Actions"
                value={formData.actions}
                onChange={(e) =>
                  setFormData({ ...formData, actions: e.target.value })
                }
                className="h-20"
                placeholder="What did you do?"
              />

              <Textarea
                label="Impact"
                value={formData.impact}
                onChange={(e) =>
                  setFormData({ ...formData, impact: e.target.value })
                }
                className="h-20"
                placeholder="What was the result?"
              />

              <Textarea
                label="Metrics"
                value={formData.metrics}
                onChange={(e) =>
                  setFormData({ ...formData, metrics: e.target.value })
                }
                className="h-20"
                placeholder="Quantifiable outcomes (e.g., '25% increase in performance')"
              />

              <Input
                label="Contribution Date"
                type="date"
                value={formData.contribution_date}
                onChange={(e) =>
                  setFormData({ ...formData, contribution_date: e.target.value })
                }
              />
            </div>

            <div className="mt-6 flex gap-2">
              {editingId ? (
                <>
                  <Button
                    onClick={() => handleSaveEdit(editingId)}
                    variant="success"
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleSubmit}
                  variant="primary"
                >
                  Add Contribution
                </Button>
              )}
            </div>
          </Card>

          {/* Contributions List */}
          {contributions.length === 0 && (
            <Card className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contributions yet</h3>
              <p className="text-gray-600">
                Start documenting your achievements at this company.
              </p>
            </Card>
          )}

          {contributions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {contributions.length} Contribution{contributions.length !== 1 ? 's' : ''}
              </h2>

              {contributions.map((contrib) => (
                <Card key={contrib.id}>
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{contrib.title}</h3>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {contrib.contribution_date || 'N/A'}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>Added {new Date(contrib.created_at).toLocaleDateString()}</span>
                        </p>
                      </div>

                      {contrib.context && (
                        <div>
                          <strong className="text-sm font-semibold text-gray-700">Context:</strong>
                          <p className="text-sm text-gray-600 mt-0.5">{contrib.context}</p>
                        </div>
                      )}

                      {contrib.actions && (
                        <div>
                          <strong className="text-sm font-semibold text-gray-700">Actions:</strong>
                          <p className="text-sm text-gray-600 mt-0.5">{contrib.actions}</p>
                        </div>
                      )}

                      {contrib.impact && (
                        <div>
                          <strong className="text-sm font-semibold text-gray-700">Impact:</strong>
                          <p className="text-sm text-gray-600 mt-0.5">{contrib.impact}</p>
                        </div>
                      )}

                      {contrib.metrics && (
                        <div>
                          <strong className="text-sm font-semibold text-gray-700">Metrics:</strong>
                          <p className="text-sm text-gray-600 mt-0.5">{contrib.metrics}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col gap-2 sm:items-end">
                      <Button
                        onClick={() => handleEdit(contrib)}
                        variant="secondary"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(contrib.id)}
                        variant="danger"
                        size="sm"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
