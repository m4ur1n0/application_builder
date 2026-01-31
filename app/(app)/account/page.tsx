'use client';

import { useState, useEffect } from 'react';
import { getFilesViaProxy, uploadFile } from '@/lib/api';
import type { UploadedFile } from '@/lib/types';

export default function AccountPage() {
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
      <h1 className="text-2xl font-bold">Account & Files</h1>

      {/* Upload Status */}
      {uploadStatus && (
        <div className="border rounded p-3 bg-blue-50">
          <p className="text-sm">{uploadStatus}</p>
        </div>
      )}

      {/* Upload Resume Section */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-3">Upload Resume</h2>
        <div className="space-y-2">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            className="block"
          />
          <button
            onClick={handleUploadResume}
            disabled={!resumeFile}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            Upload Resume
          </button>
        </div>
      </div>

      {/* Upload About/Projects Section */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-3">Upload About/Projects Information</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Option 1: Paste Text</label>
            <textarea
              placeholder="Enter your about/projects information..."
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className="border p-2 w-full h-32"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Option 2: Upload File</label>
            <input
              type="file"
              onChange={(e) => setAboutFile(e.target.files?.[0] || null)}
              className="block"
            />
          </div>

          <button
            onClick={handleUploadAbout}
            disabled={!aboutText.trim() && !aboutFile}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            Upload About/Projects
          </button>
        </div>
      </div>

      {/* Current Files Section */}
      <div className="border rounded p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Your Files</h2>
          <button
            onClick={fetchFiles}
            className="text-sm text-blue-600 hover:underline"
          >
            Refresh
          </button>
        </div>

        {loading && <p className="text-gray-500">Loading files...</p>}

        {error && (
          <div className="border border-yellow-300 bg-yellow-50 p-3 rounded">
            <p className="text-sm text-yellow-800">{error}</p>
            <p className="text-xs text-yellow-700 mt-1">
              Note: File listing requires the Cloudflare proxy worker to be configured.
              Check NEXT_PUBLIC_CLOUDFLARE_PROXY_BASE_URL and
              NEXT_PUBLIC_CLOUDFLARE_PROXY_INTERNAL_KEY environment variables.
            </p>
          </div>
        )}

        {!loading && !error && files.length === 0 && (
          <p className="text-gray-500">No files uploaded yet.</p>
        )}

        {!loading && !error && files.length > 0 && (
          <div className="space-y-4">
            {/* Resume Section */}
            {resumeFiles.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Resume</h3>
                <div className="space-y-2">
                  {resumeFiles.map((file) => (
                    <div key={file.key} className="border rounded p-3 bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                          {/* Placeholder thumbnail */}
                          PDF
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{file.filename}</p>
                          <p className="text-xs text-gray-600">
                            Uploaded: {new Date(file.uploaded_at).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Key: {file.key}</p>
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
                <h3 className="font-medium mb-2">About & Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aboutFiles.map((file) => (
                    <div key={file.key} className="border rounded p-3 bg-gray-50">
                      <p className="font-medium text-sm">{file.filename}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(file.uploaded_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Kind: {file.kind} | Key: {file.key}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
