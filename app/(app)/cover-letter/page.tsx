'use client';

import { useState } from 'react';

export default function CoverLetterPage() {
  const [inputMode, setInputMode] = useState<'link' | 'paste'>('link');
  const [jobLink, setJobLink] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [coverLetterContent, setCoverLetterContent] = useState('');

  // TODO: Implement scraping logic for job links
  const handleFetchJobData = () => {
    console.log('TODO: Fetch job data from:', jobLink);
    // Will be implemented in a later prompt
  };

  // TODO: Implement LLM generation
  const handleGenerateCoverLetter = () => {
    console.log('TODO: Generate cover letter using LLM');
    console.log('Job description:', inputMode === 'paste' ? jobDescription : 'From link: ' + jobLink);
    // Will be implemented in a later prompt
  };

  // TODO: Implement download functionality
  const handleDownload = () => {
    console.log('TODO: Download cover letter as PDF');
    // Will be implemented in a later prompt
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cover Letter Creator</h1>

      {/* Job Context Section */}
      <div className="border rounded p-4">
        <h2 className="text-lg font-semibold mb-4">Job Context</h2>

        <div className="mb-4 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="inputMode"
              value="link"
              checked={inputMode === 'link'}
              onChange={() => setInputMode('link')}
            />
            <span>Paste job link (scrape later)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="inputMode"
              value="paste"
              checked={inputMode === 'paste'}
              onChange={() => setInputMode('paste')}
            />
            <span>Paste job description</span>
          </label>
        </div>

        {inputMode === 'link' ? (
          <div className="space-y-2">
            <input
              type="url"
              placeholder="https://example.com/jobs/12345"
              value={jobLink}
              onChange={(e) => setJobLink(e.target.value)}
              className="border p-2 w-full"
            />
            <button
              disabled
              onClick={handleFetchJobData}
              className="bg-gray-300 text-gray-600 px-4 py-2 rounded cursor-not-allowed"
              title="Scraping will be implemented in a later update"
            >
              Fetch (Coming Soon)
            </button>
            <p className="text-xs text-gray-500">
              {/* TODO: Implement job link scraping */}
              Note: Job scraping functionality will be added in a future update.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="border p-3 w-full h-64 font-mono text-sm"
            />
          </div>
        )}
      </div>

      {/* Cover Letter Editor Section */}
      <div className="border rounded p-4">
        <h2 className="text-lg font-semibold mb-4">Cover Letter Editor</h2>

        <div className="mb-4">
          <textarea
            placeholder="Your cover letter will appear here..."
            value={coverLetterContent}
            onChange={(e) => setCoverLetterContent(e.target.value)}
            className="border p-4 w-full h-96 font-serif whitespace-pre-wrap"
            style={{ lineHeight: '1.6' }}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGenerateCoverLetter}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Generate Cover Letter
          </button>
          <button
            onClick={handleDownload}
            disabled={!coverLetterContent.trim()}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Download
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          {/* TODO: Implement LLM generation and PDF download */}
          Note: Cover letter generation and download will be implemented in future updates.
        </p>
      </div>
    </div>
  );
}
