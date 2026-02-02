'use client';

import { useState, useEffect } from 'react';
import { getFilesViaProxy, uploadFile } from '@/lib/api';
import { useAuth } from '@/components/AuthGate';
import type { UploadedFile } from '@/lib/types';
import { Button, Textarea, Card, Alert } from '@/components/ui';

export default function AccountPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  // Upload form state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [aboutText, setAboutText] = useState('');
  const [aboutFile, setAboutFile] = useState<File | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    setError('');

    const result = await getFilesViaProxy();

    if (result.ok && result.data) {
      setFiles(result.data.files);
    } else {
      setError(result.error || 'Failed to fetch files');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUploadResume = async () => {
    if (!resumeFile) {
      alert('Please select a resume file');
      return;
    }

    setUploadStatus('Uploading resume...');
    const result = await uploadFile('resume', resumeFile);

    if (result.ok && result.data) {
      setUploadStatus(`Resume uploaded: ${result.data.key}`);
      setResumeFile(null);
      fetchFiles();
    } else {
      setUploadStatus(`Error: ${result.error}`);
    }
  };

  const handleUploadAbout = async () => {
    let fileToUpload: File;

    if (aboutFile) {
      fileToUpload = aboutFile;
    } else if (aboutText.trim()) {
      // Convert text to file
      const blob = new Blob([aboutText], { type: 'text/plain' });
      fileToUpload = new File([blob], 'about.txt', { type: 'text/plain' });
    } else {
      alert('Please provide either text content or select a file');
      return;
    }

    setUploadStatus('Uploading about/projects...');
    const result = await uploadFile('about', fileToUpload);

    if (result.ok && result.data) {
      setUploadStatus(`About/projects uploaded: ${result.data.key}`);
      setAboutText('');
      setAboutFile(null);
      fetchFiles();
    } else {
      setUploadStatus(`Error: ${result.error}`);
    }
  };

  // Separate files by kind
  const resumeFiles = files.filter((f) => f.kind === 'resume');
  const aboutFiles = files.filter((f) => f.kind === 'about' || f.kind === 'other');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Account & Files</h1>
        {user && (
          <div className="mt-3 text-sm">
            <p className="text-gray-700">
              Logged in as: <span className="font-semibold text-gray-900">{user.email}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Account created: {new Date(user.created_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <Alert variant="info">{uploadStatus}</Alert>
      )}

      {/* Upload Resume Section */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Upload Resume</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select PDF, DOC, or DOCX file
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>
          <Button
            onClick={handleUploadResume}
            disabled={!resumeFile}
            variant="primary"
          >
            Upload Resume
          </Button>
        </div>
      </Card>

      {/* Upload About/Projects Section */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Upload About/Projects Information</h2>

        <div className="space-y-4">
          <Textarea
            label="Option 1: Paste Text"
            placeholder="Enter your about/projects information..."
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            className="h-32"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Option 2: Upload File
            </label>
            <input
              type="file"
              onChange={(e) => setAboutFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>

          <Button
            onClick={handleUploadAbout}
            disabled={!aboutText.trim() && !aboutFile}
            variant="primary"
          >
            Upload About/Projects
          </Button>
        </div>
      </Card>

      {/* Current Files Section */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Files</h2>
          <Button
            onClick={fetchFiles}
            variant="ghost"
            size="sm"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-sm text-gray-600">Loading files...</p>
          </div>
        )}

        {error && (
          <Alert variant="warning">
            <p className="font-medium">{error}</p>
            <p className="text-xs mt-1">
              Note: File listing requires the Cloudflare proxy worker to be configured.
              Check CLOUDFLARE_PROXY_BASE_URL and CLOUDFLARE_PROXY_INTERNAL_KEY environment variables.
            </p>
          </Alert>
        )}

        {!loading && !error && files.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded yet</h3>
            <p className="text-gray-600">Upload your resume and projects to get started.</p>
          </div>
        )}

        {!loading && !error && files.length > 0 && (
          <div className="space-y-6">
            {/* Resume Section */}
            {resumeFiles.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-3">Resume</h3>
                <div className="space-y-3">
                  {resumeFiles.map((file) => (
                    <div key={file.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{file.filename}</p>
                          <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Uploaded {new Date(file.uploaded_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 truncate">Key: {file.key}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* About/Other Files Section */}
            {aboutFiles.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-3">About & Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aboutFiles.map((file) => (
                    <div key={file.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{file.filename}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(file.uploaded_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {file.kind}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
