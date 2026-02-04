'use client';

import { useState, useEffect, useRef } from 'react';
import { generateCoverLetter, listCompanies, listCompanyContributions, scrapeJobPosting } from '@/lib/api';
import { downloadAndParsePdf } from '@/lib/pdf-utils';
import { getToken } from '@/lib/auth';
import { useAuth } from '@/components/AuthGate';
import type { Company } from '@/lib/types';
import { Button, Input, Textarea, Select, Card, Alert } from '@/components/ui';

/**
 * Cover Letter Page - Signal & Static Design
 *
 * Layout: Split view on desktop (left: inputs, right: document editor)
 * Editor: Document-like surface with basic formatting controls
 *
 * Note on formatting: Bold/Italic/Underline are applied in the editor for preview,
 * but PDF export currently strips formatting and exports plain text only.
 * To preserve formatting in PDF, extend /api/cover-letter/export to parse HTML.
 */

export default function CoverLetterPage() {
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);

  // State
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

  // Sync editor content with state
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== coverLetterContent) {
      editorRef.current.innerHTML = coverLetterContent;
    }
  }, [coverLetterContent]);

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
        setJobDescription(descriptionText);
        setInputMode('paste');

        if (usedFallback) {
          setScrapingWarning(
            'Note: Generic extraction used. Review description for completeness.'
          );
        }

        setError('');
      } else {
        setError(result.error || 'Failed to scrape job posting');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const jobText = inputMode === 'paste' ? jobDescription : '';
      if (!jobText.trim()) {
        setError('Please provide a job description');
        setLoading(false);
        return;
      }

      let resumeText = '';
      try {
        resumeText = await downloadAndParsePdf('/api/resume', token);
      } catch {
        setError('Failed to fetch resume. Upload a resume first.');
        setLoading(false);
        return;
      }

      let extraText = '';
      try {
        extraText = await downloadAndParsePdf('/api/about', token);
      } catch {
        console.log('No about file (optional)');
      }

      let instructions = extraInstructions.trim();

      if (focusCompanyId) {
        const focusCompany = companies.find(c => c.company_id === focusCompanyId);
        if (focusCompany) {
          const contribResult = await listCompanyContributions(focusCompanyId);
          if (contribResult.ok && contribResult.data) {
            const contributions = contribResult.data.items;
            instructions += `\n\nFocus on ${focusCompany.company_name} - ${focusCompany.position}. ${contributions.length} relevant contributions.`;
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
        // Convert plain text to HTML with paragraphs
        const htmlContent = result.data.letterText
          .split('\n\n')
          .map(p => p.trim())
          .filter(Boolean)
          .map(p => `<p>${p}</p>`)
          .join('\n');
        setCoverLetterContent(htmlContent);
      } else {
        setError(result.error || 'Generation failed');
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
        setError('Not authenticated');
        setDownloading(false);
        return;
      }

      if (!coverLetterContent.trim()) {
        setError('Generate a cover letter first');
        setDownloading(false);
        return;
      }

      // Strip HTML for PDF export (plain text only)
      const plainText = editorRef.current?.innerText || coverLetterContent.replace(/<[^>]*>/g, '');

      const response = await fetch('/api/cover-letter/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          coverLetterText: plainText,
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
        setError(errorData.error || 'PDF export failed');
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

  // Formatting controls
  const applyFormat = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setCoverLetterContent(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with telemetry */}
      <div>
        <div className="telemetry-row mb-3">
          <div className="telemetry-item">
            <span className="status-dot status-dot-active" />
            <span>EDITOR</span>
          </div>
          <div className="telemetry-item">
            <span>AI_GENERATION</span>
          </div>
        </div>
        <h1 className="text-2xl font-medium text-stone-900 mb-1">Cover Letter Creator</h1>
        <p className="text-sm text-stone-600">Generate tailored cover letters using AI</p>
      </div>

      {/* Split Layout: Left (inputs) / Right (document editor) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Inputs */}
        <div className="space-y-6">
          {/* Job Context */}
          <Card>
            <h2 className="text-base font-medium text-stone-900 mb-4 flex items-center gap-2">
              <span className="status-dot status-dot-idle" />
              Job Context
            </h2>

            <div className="mb-4 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="inputMode"
                  value="link"
                  checked={inputMode === 'link'}
                  onChange={() => setInputMode('link')}
                />
                <span>Import URL</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="inputMode"
                  value="paste"
                  checked={inputMode === 'paste'}
                  onChange={() => setInputMode('paste')}
                />
                <span>Paste Description</span>
              </label>
            </div>

            {inputMode === 'link' ? (
              <div className="space-y-3">
                <Input
                  type="url"
                  placeholder="https://..."
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                  disabled={scraping}
                  helperText="Supports most job boards"
                />
                <Button
                  onClick={handleFetchJobData}
                  disabled={scraping || !jobLink.trim()}
                  variant="secondary"
                  size="sm"
                >
                  {scraping ? 'Importing...' : 'Import'}
                </Button>
                {scrapingWarning && (
                  <Alert variant="warning">{scrapingWarning}</Alert>
                )}
              </div>
            ) : (
              <Textarea
                placeholder="Paste full job description..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="h-40 font-mono text-xs"
              />
            )}
          </Card>

          {/* Generation Options */}
          <Card>
            <h2 className="text-base font-medium text-stone-900 mb-4 flex items-center gap-2">
              <span className="status-dot status-dot-idle" />
              Options
            </h2>

            <div className="space-y-4">
              <Select
                label="Focus Job (Optional)"
                value={focusCompanyId}
                onChange={(e) => setFocusCompanyId(e.target.value)}
              >
                <option value="">-- None --</option>
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.company_name} - {company.position}
                  </option>
                ))}
              </Select>

              <Textarea
                label="Extra Instructions (Optional)"
                placeholder="Additional context or requirements..."
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
                className="h-20 text-xs"
                maxLength={2000}
              />

              <Button
                onClick={handleGenerateCoverLetter}
                disabled={loading || (inputMode === 'paste' && !jobDescription.trim())}
                variant="primary"
                size="md"
                fullWidth
              >
                {loading ? 'Generating...' : 'Generate Letter'}
              </Button>
            </div>
          </Card>

          {/* Header Info */}
          <Card>
            <h2 className="text-base font-medium text-stone-900 mb-4 flex items-center gap-2">
              <span className="status-dot status-dot-idle" />
              Your Information
            </h2>
            <div className="grid grid-cols-1 gap-4">
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
          </Card>
        </div>

        {/* RIGHT COLUMN: Document Editor */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card padding="none" className="corner-ticks">
            {/* Telemetry header */}
            <div className="telemetry-row px-5 py-3 border-b border-stone-200 bg-stone-50">
              <div className="telemetry-item">
                <span>DOCUMENT</span>
              </div>
              <div className="telemetry-item">
                <span>{coverLetterContent ? 'DRAFT' : 'EMPTY'}</span>
              </div>
            </div>

            {/* Formatting toolbar */}
            <div className="px-5 py-2 border-b border-stone-200 bg-white flex items-center gap-1">
              <span className="text-xs text-stone-500 mr-2 uppercase tracking-wide">Format:</span>
              <button
                onClick={() => applyFormat('bold')}
                className="px-2 py-1 text-xs font-bold hover:bg-stone-100 border border-stone-200 transition-colors"
                title="Bold"
              >
                B
              </button>
              <button
                onClick={() => applyFormat('italic')}
                className="px-2 py-1 text-xs italic hover:bg-stone-100 border border-stone-200 transition-colors"
                title="Italic"
              >
                I
              </button>
              <button
                onClick={() => applyFormat('underline')}
                className="px-2 py-1 text-xs underline hover:bg-stone-100 border border-stone-200 transition-colors"
                title="Underline"
              >
                U
              </button>
              <span className="text-xs text-stone-400 ml-2">
                (Select text first)
              </span>
            </div>

            {/* Document surface */}
            <div className="p-8 bg-stone-50" style={{ minHeight: '700px' }}>
              {error && (
                <Alert variant="error" className="mb-4">
                  {error}
                </Alert>
              )}

              {loading && (
                <Alert variant="info" className="mb-4">
                  Generating cover letter...
                </Alert>
              )}

              {/* Paper-like editor */}
              <div className="document-surface mx-auto p-12" style={{ maxWidth: '650px', minHeight: '600px' }}>
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleEditorInput}
                  className="outline-none text-stone-900"
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: '14px',
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap',
                  }}
                  suppressContentEditableWarning
                  data-placeholder="Your cover letter will appear here. You can edit and format it..."
                />
              </div>
            </div>

            {/* Document actions */}
            <div className="signal-ruler" data-label="EXPORT" />
            <div className="px-5 py-4 bg-stone-50 border-t border-stone-200">
              <Button
                onClick={handleDownloadPDF}
                disabled={!coverLetterContent.trim() || downloading}
                variant="success"
                size="md"
                fullWidth
              >
                {downloading ? 'Preparing...' : 'Download PDF (Cover Letter + Resume)'}
              </Button>
              <p className="text-xs text-stone-500 mt-2 text-center">
                Note: PDF exports plain text (formatting for preview only)
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
