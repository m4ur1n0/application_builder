'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listCompanies, createCompany, deleteCompany } from '@/lib/api';
import type { Company } from '@/lib/types';
import { Button, Input, Card, Alert } from '@/components/ui';

export default function ContributionsPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    position: '',
  });

  const fetchCompanies = async () => {
    setLoading(true);
    setError('');

    const result = await listCompanies();

    if (result.ok && result.data) {
      setCompanies(result.data.companies);
    } else {
      setError(result.error || 'Failed to fetch companies');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateCompany = async () => {
    if (!formData.companyName.trim() || !formData.position.trim()) {
      alert('Company name and position are required');
      return;
    }

    const result = await createCompany({
      companyName: formData.companyName.trim(),
      position: formData.position.trim(),
    });

    if (result.ok) {
      setFormData({ companyName: '', position: '' });
      setShowForm(false);
      fetchCompanies();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!confirm(`Delete "${companyName}" and all its contributions?`)) return;

    const result = await deleteCompany(companyId);
    if (result.ok) {
      fetchCompanies();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleNavigateToCompany = (companyId: string) => {
    router.push(`/contributions/${companyId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Companies & Contributions</h1>
          <p className="text-gray-600 mt-1">Track your work experience and contributions</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchCompanies}
            variant="secondary"
            size="sm"
          >
            Refresh
          </Button>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? 'secondary' : 'primary'}
            size="sm"
          >
            {showForm ? 'Cancel' : 'Add Company'}
          </Button>
        </div>
      </div>

      {/* New Company Form */}
      {showForm && (
        <Card className="bg-gray-50">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Add New Company</h2>
          <div className="space-y-4">
            <Input
              label="Company Name"
              type="text"
              placeholder="e.g., Acme Corp"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
            <Input
              label="Position"
              type="text"
              placeholder="e.g., Software Engineer"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
          </div>
          <div className="mt-6 flex gap-2">
            <Button
              onClick={handleCreateCompany}
              variant="success"
            >
              Create Company
            </Button>
            <Button
              onClick={() => {
                setShowForm(false);
                setFormData({ companyName: '', position: '' });
              }}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-sm text-gray-600">Loading companies...</p>
        </div>
      )}

      {/* Error State */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Empty State */}
      {!loading && !error && companies.length === 0 && (
        <Card className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No companies yet</h3>
          <p className="text-gray-600 mb-6">
            Get started by adding your first company and tracking contributions.
          </p>
          <Button
            onClick={() => setShowForm(true)}
            variant="primary"
          >
            Add Company
          </Button>
        </Card>
      )}

      {/* Companies List */}
      {!loading && companies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map((company) => (
            <Card
              key={company.company_id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => handleNavigateToCompany(company.company_id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {company.company_name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{company.position}</p>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(company.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCompany(company.company_id, company.company_name);
                  }}
                  variant="danger"
                  size="sm"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
