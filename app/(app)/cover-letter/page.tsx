'use client';

import { useState, useEffect } from 'react';
import { generateCoverLetter, listCompanies, listCompanyContributions, scrapeJobPosting } from '@/lib/api';
import { downloadAndParsePdf } from '@/lib/pdf-utils';
import { getToken } from '@/lib/auth';
import { useAuth } from '@/components/AuthGate';
import type { Company } from '@/lib/types';
import { Button, Input, Textarea, Select, Card, Alert } from '@/components/ui';

export default function CoverLetterPage() {
  const { user } = useAuth();
  const [inputMode, setInputMode] = useState<'link' | 'paste'>('paste');
  const [jobLink, setJobLink] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [coverLetterContent, setCoverLetterContent] = useState('');
  const [extraInstructions, setExtraInstructions] = useState('');
  const [focusCompanyId, setFocusCompanyId] = useState<string>('');

  // Header fields
  const [headerName, setHeaderName] = useState('');
  const [headerEmail, setHeaderEmail] = useState('');
  const [headerPhone, setHeaderPhone] = useState('');
  const [headerAddress, setHeaderAddress] = useState('');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState('');
  const [scrapingWarning, setScrapingWarning] = useState('');

  // Auto-populate email from user profile
  useEffect(() => {
    if (user?.email) {
      setHeaderEmail(user.email);
    }
  }, [user]);

  // Load saved header info from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('coverLetterHeaderName');
    const savedPhone = localStorage.getItem('coverLetterHeaderPhone');
    const savedAddress = localStorage.getItem('coverLetterHeaderAddress');

    if (savedName) setHeaderName(savedName);
    if (savedPhone) setHeaderPhone(savedPhone);
    if (savedAddress) setHeaderAddress(savedAddress);
  }, []);

  // Save header info to localStorage
  useEffect(() => {
    if (headerName) localStorage.setItem('coverLetterHeaderName', headerName);
    if (headerPhone) localStorage.setItem('coverLetterHeaderPhone', headerPhone);
    if (headerAddress) localStorage.setItem('coverLetterHeaderAddress', headerAddress);
  }, [headerName, headerPhone, headerAddress]);

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      const result = await listCompanies();
      if (result.ok && result.data) {
        setCompanies(result.data.companies);
      }
    };
    fetchCompanies();
  }, []);

  const handleFetchJobData = async () => {
    if (!jobLink.trim()) {
      setError('Please enter a job posting URL');
      return;
    }

    setScraping(true);
    setError('');
    setScrapingWarning('');

    try {
      const result = await scrapeJobPosting(jobLink);

      if (result.ok && result.data) {
        const { descriptionText, title, company, location, usedFallback } = result.data;

        // Populate the job description textarea
        setJobDescription(descriptionText);

        // Switch to paste mode so user can see/edit the description
        setInputMode('paste');

        // Show warning if fallback was used
        if (usedFallback) {
          setScrapingWarning(
            'Note: Generic extraction was used. Please review the job description below to ensure it\'s complete and accurate.'
          );
        }

        // Build a success message
        let successMsg = 'Job description imported successfully!';
        if (title) successMsg += ` (${title}`;
        if (company) successMsg += ` at ${company}`;
        if (location) successMsg += ` - ${location}`;
        if (title) successMsg += ')';

        setError('');
        console.log(successMsg);
      } else {
        setError(result.error || 'Failed to scrape job posting');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setScraping(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        setError('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }

      const jobText = inputMode === 'paste' ? jobDescription : '';
      if (!jobText.trim()) {
        setError('Please provide a job description.');
        setLoading(false);
        return;
      }

      let resumeText = '';
      try {
        resumeText = await downloadAndParsePdf('/api/resume', token);
      } catch {
        setError('Failed to fetch resume. Please ensure you have uploaded a resume.');
        setLoading(false);
        return;
      }

      let extraText = '';
      try {
        extraText = await downloadAndParsePdf('/api/about', token);
      } catch {
        console.log('No about file found or failed to parse (optional)');
      }

      let instructions = extraInstructions.trim();

      if (focusCompanyId) {
        const focusCompany = companies.find(c => c.company_id === focusCompanyId);
        if (focusCompany) {
          const contribResult = await listCompanyContributions(focusCompanyId);
          if (contribResult.ok && contribResult.data) {
            const contributions = contribResult.data.items;
            const focusInstruction = `\n\nFocus on highlighting my contributions from this job: ${focusCompany.company_name} - ${focusCompany.position}. Relevant contributions: ${contributions.length} items. Use them as evidence.`;
            instructions += focusInstruction;
          }
        }
      }

      const result = await generateCoverLetter({
        texts: {
          resume: resumeText,
          job: jobText,
          extra: extraText || undefined,
        },
        instructions: instructions || undefined,
      });

      if (result.ok && result.data) {
        setCoverLetterContent(result.data.letterText);
      } else {
        setError(result.error || 'Failed to generate cover letter');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        setError('Not authenticated. Please log in.');
        setDownloading(false);
        return;
      }

      if (!coverLetterContent.trim()) {
        setError('Please generate a cover letter first.');
        setDownloading(false);
        return;
      }

      const response = await fetch('/api/cover-letter/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          coverLetterText: coverLetterContent,
          header: {
            name: headerName,
            email: headerEmail,
            phone: headerPhone,
            address: headerAddress,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        setError(errorData.error || 'Failed to download PDF');
        setDownloading(false);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CoverLetter+Resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cover Letter Creator</h1>
        <p className="text-gray-600">Generate a tailored cover letter using AI</p>
      </div>

      {/* Job Context Section */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Job Context</h2>

          <div className="mb-4 flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="inputMode"
                value="link"
                checked={inputMode === 'link'}
                onChange={() => setInputMode('link')}
                className="w-4 h-4"
              />
              <span className="text-sm">Import from job posting URL</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="inputMode"
                value="paste"
                checked={inputMode === 'paste'}
                onChange={() => setInputMode('paste')}
                className="w-4 h-4"
              />
              <span className="text-sm">Paste job description manually</span>
            </label>
          </div>

          {inputMode === 'link' ? (
            <div className="space-y-3">
              <Input
                type="url"
                placeholder="https://boards.greenhouse.io/company/jobs/12345"
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
                disabled={scraping}
                helperText="Supports Greenhouse, Lever, Ashby, Workday, and most other job boards."
              />
              <Button
                onClick={handleFetchJobData}
                disabled={scraping || !jobLink.trim()}
                variant="primary"
              >
                {scraping ? 'Importing...' : 'Import Job Description'}
              </Button>
              {scrapingWarning && (
                <Alert variant="warning">{scrapingWarning}</Alert>
              )}
            </div>
          ) : (
            <Textarea
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="h-48 font-mono"
            />
          )}
      </Card>

      {/* Generation Options Section */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Generation Options</h2>

          <div className="space-y-4">
            <Select
              label="Focus Job (Optional)"
              value={focusCompanyId}
              onChange={(e) => setFocusCompanyId(e.target.value)}
              helperText="Select a specific job to highlight its contributions in the cover letter."
            >
              <option value="">-- None (use all contributions) --</option>
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.company_name} - {company.position}
                </option>
              ))}
            </Select>

            <Textarea
              label="Optional Extra Prompt Info"
              placeholder="Add any special instructions or context here (e.g., 'Emphasize leadership skills', 'Keep it under 300 words')..."
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
              className="h-24"
              maxLength={2000}
              helperText={`${extraInstructions.length}/2000 characters`}
            />

            <Button
              onClick={handleGenerateCoverLetter}
              disabled={loading || (inputMode === 'paste' && !jobDescription.trim())}
              variant="primary"
              size="lg"
              fullWidth
            >
              {loading ? 'Generating...' : 'Generate Cover Letter'}
            </Button>
          </div>
      </Card>

      {/* Cover Letter Document */}
      <Card variant="elevated" padding="none" className="overflow-hidden">
        {/* Document Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-8 py-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={headerName}
              onChange={(e) => setHeaderName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={headerEmail}
              onChange={(e) => setHeaderEmail(e.target.value)}
            />
            <Input
              label="Phone (Optional)"
              type="tel"
              placeholder="(555) 123-4567"
              value={headerPhone}
              onChange={(e) => setHeaderPhone(e.target.value)}
            />
            <Input
              label="Address (Optional)"
              type="text"
              placeholder="City, State"
              value={headerAddress}
              onChange={(e) => setHeaderAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Document Editor */}
        <div className="px-8 md:px-16 py-8" style={{ minHeight: '600px' }}>
          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          {loading && (
            <Alert variant="info" className="mb-6">
              Fetching files and generating cover letter...
            </Alert>
          )}

          <textarea
            placeholder="Your cover letter will appear here after generation. You can edit it directly..."
            value={coverLetterContent}
            onChange={(e) => setCoverLetterContent(e.target.value)}
            className="w-full h-125 font-serif text-base leading-relaxed resize-none focus:outline-none whitespace-pre-wrap"
            style={{
              lineHeight: '1.8',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          />
        </div>

        {/* Document Actions */}
        <div className="border-t border-gray-200 bg-gray-50 px-8 py-4">
          <Button
            onClick={handleDownloadPDF}
            disabled={!coverLetterContent.trim() || downloading}
            variant="success"
            size="lg"
          >
            {downloading ? 'Preparing PDF...' : 'Download Cover Letter + Resume (PDF)'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
