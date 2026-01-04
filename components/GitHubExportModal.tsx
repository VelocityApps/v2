'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface GitHubExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  projectDescription?: string;
  projectId?: string;
  onSuccess?: (repoUrl: string) => void;
}

export default function GitHubExportModal({
  isOpen,
  onClose,
  code,
  projectDescription,
  projectId,
  onSuccess,
}: GitHubExportModalProps) {
  const { session } = useAuth();
  const [repoName, setRepoName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (isOpen) {
      checkGitHubAuth();
      // Generate default repo name from project description or timestamp
      if (!repoName) {
        const defaultName = projectDescription
          ? projectDescription
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
              .substring(0, 50) || 'forgedapps-project'
          : `forgedapps-project-${Date.now()}`;
        setRepoName(defaultName);
      }
    }
  }, [isOpen]);

  const checkGitHubAuth = async () => {
    if (!session) return;
    
    setCheckingAuth(true);
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.github_username && data.github_token) {
          setIsAuthenticated(true);
          setGithubUsername(data.github_username);
        } else {
          setIsAuthenticated(false);
        }
      }
    } catch (err) {
      console.error('[GitHubExport] Error checking auth:', err);
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleConnectGitHub = () => {
    window.location.href = '/api/auth/github';
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !isAuthenticated) return;

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/github/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          repoName: repoName.trim(),
          description: description.trim(),
          code,
          projectDescription,
          projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export to GitHub');
      }

      // Success
      if (onSuccess) {
        onSuccess(data.repoUrl);
      }
      
      onClose();
      
      // Show success message (you can use a toast library here)
      alert(`✅ Successfully exported to GitHub!\n\nRepository: ${data.repoFullName}\n\nView it at: ${data.repoUrl}`);
    } catch (err: any) {
      setError(err.message || 'Failed to export to GitHub');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Export to GitHub</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {checkingAuth ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-gray-300">
              Connect your GitHub account to export your code directly to a new repository.
            </p>
            <button
              onClick={handleConnectGitHub}
              className="w-full px-6 py-3 bg-[#24292e] hover:bg-[#2f363d] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Connect GitHub
            </button>
          </div>
        ) : (
          <form onSubmit={handleExport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Repository Name *
              </label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                required
                pattern="[a-zA-Z0-9._-]+"
                title="Repository name can only contain letters, numbers, dots, hyphens, and underscores"
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff6b35] transition-colors"
                placeholder="my-awesome-project"
              />
              <p className="text-xs text-gray-500 mt-1">
                Connected as: <span className="text-[#ff6b35]">{githubUsername}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff6b35] transition-colors"
                placeholder="A brief description of your project"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/30 text-red-300 border border-red-500/50 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-[#333] hover:bg-[#444] text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !repoName.trim()}
                className="flex-1 px-6 py-3 bg-[#ff6b35] hover:bg-[#ff7b45] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Export to GitHub
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

