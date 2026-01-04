'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface VercelDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  projectName?: string;
  onSuccess?: (deploymentUrl: string) => void;
}

export default function VercelDeployModal({
  isOpen,
  onClose,
  code,
  projectName,
  onSuccess,
}: VercelDeployModalProps) {
  const { session } = useAuth();
  const [deploymentName, setDeploymentName] = useState(projectName || '');
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [detectedEnvVars, setDetectedEnvVars] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'failed'>('idle');
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (isOpen && code) {
      checkVercelAuth();
      detectEnvVars();
      if (!deploymentName) {
        const defaultName = projectName || `forgedapps-${Date.now()}`;
        setDeploymentName(defaultName);
      }
    }
  }, [isOpen, code]);

  const checkVercelAuth = async () => {
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
        if (data.vercel_token) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    } catch (err) {
      console.error('[VercelDeploy] Error checking auth:', err);
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const detectEnvVars = async () => {
    if (!session || !code) return;

    setDetecting(true);
    try {
      const response = await fetch('/api/vercel/detect-env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok && data.envVars) {
        setDetectedEnvVars(data.envVars);
        // Initialize env vars with empty values
        const initialEnvVars: Record<string, string> = {};
        data.envVars.forEach((varName: string) => {
          initialEnvVars[varName] = '';
        });
        setEnvVars(initialEnvVars);
      }
    } catch (err: any) {
      console.error('[VercelDeploy] Error detecting env vars:', err);
    } finally {
      setDetecting(false);
    }
  };

  const handleConnectVercel = async () => {
    setError(null);
    try {
      // Check if Vercel is configured by making a HEAD request first
      const checkResponse = await fetch('/api/auth/vercel', { 
        method: 'HEAD'
      });
      
      // If we get a 503, Vercel is not configured
      if (checkResponse.status === 503) {
        setError('Vercel integration is not configured. This feature requires Vercel OAuth credentials (VERCEL_CLIENT_ID and VERCEL_CLIENT_SECRET) to be set up in the environment variables. Please contact your administrator.');
        return;
      }
      
      // If check passes, proceed with OAuth redirect
      if (checkResponse.ok) {
        window.location.href = '/api/auth/vercel';
      }
    } catch (err: any) {
      console.error('[VercelDeploy] Error connecting to Vercel:', err);
      setError('Failed to connect to Vercel. Please check your network connection and try again.');
    }
  };

  const pollDeploymentStatus = async (deploymentId: string) => {
    if (!session) return;

    setPolling(true);
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds total (2s intervals)

    const poll = async () => {
      try {
        const response = await fetch(`/api/vercel/deploy?deploymentId=${deploymentId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          if (data.status === 'READY' && data.url) {
            setDeploymentStatus('success');
            setDeploymentUrl(data.url);
            setPolling(false);
            if (onSuccess) {
              onSuccess(data.url);
            }
            return;
          }

          if (data.status === 'ERROR') {
            setDeploymentStatus('failed');
            setError('Deployment failed. Please check Vercel dashboard for details.');
            setPolling(false);
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setDeploymentStatus('failed');
          setError('Deployment timeout. Please check Vercel dashboard.');
          setPolling(false);
        }
      } catch (err: any) {
        console.error('[VercelDeploy] Error polling status:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setDeploymentStatus('failed');
          setError('Failed to check deployment status.');
          setPolling(false);
        }
      }
    };

    poll();
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setError(null);
    setLoading(true);
    setDeploymentStatus('deploying');

    try {
      // Filter out empty env vars
      const filteredEnvVars = Object.fromEntries(
        Object.entries(envVars).filter(([_, value]) => value.trim() !== '')
      );

      const response = await fetch('/api/vercel/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          code,
          projectName: deploymentName.trim(),
          envVars: filteredEnvVars,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deploy to Vercel');
      }

      setDeploymentId(data.deploymentId);
      setDeploymentUrl(data.deploymentUrl);
      
      // Start polling for deployment status
      if (data.deploymentId) {
        pollDeploymentStatus(data.deploymentId);
      } else {
        // If no deployment ID, assume success
        setDeploymentStatus('success');
        if (onSuccess) {
          onSuccess(data.deploymentUrl);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to deploy to Vercel');
      setDeploymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEnvVarChange = (name: string, value: string) => {
    setEnvVars((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            ▲ Deploy to Vercel
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading || polling}
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
              Connect your Vercel account to deploy your code directly to Vercel's edge network.
            </p>
            {error && (
              <div className="p-4 rounded-lg bg-yellow-900/30 text-yellow-300 border border-yellow-500/50">
                <div className="font-semibold mb-2">⚠️ Configuration Required</div>
                <div className="text-sm">{error}</div>
              </div>
            )}
            <button
              onClick={handleConnectVercel}
              className="w-full px-6 py-3 bg-black hover:bg-gray-900 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-gray-700"
            >
              <span className="text-xl">▲</span>
              Connect Vercel
            </button>
          </div>
        ) : deploymentStatus === 'success' && deploymentUrl ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-900/30 text-green-300 border border-green-500/50">
              <div className="font-semibold mb-2">✅ Deployed Successfully!</div>
              <div className="text-sm">
                Your app is live on Vercel.
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Deployment URL
              </label>
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-[#ff6b35] hover:text-[#ff7b45] break-all"
              >
                {deploymentUrl}
              </a>
            </div>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-[#ff6b35] hover:bg-[#ff7b45] text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        ) : deploymentStatus === 'failed' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-red-900/30 text-red-300 border border-red-500/50">
              <div className="font-semibold mb-2">❌ Deployment Failed</div>
              <div className="text-sm">{error || 'Unknown error occurred'}</div>
            </div>
            {deploymentUrl && (
              <div className="text-sm text-gray-400">
                Check your Vercel dashboard: <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[#ff6b35] hover:underline">vercel.com/dashboard</a>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-[#333] hover:bg-[#444] text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setDeploymentStatus('idle');
                  setError(null);
                  setDeploymentUrl(null);
                }}
                className="flex-1 px-6 py-3 bg-[#ff6b35] hover:bg-[#ff7b45] text-white rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDeploy} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={deploymentName}
                onChange={(e) => setDeploymentName(e.target.value)}
                required
                pattern="[a-zA-Z0-9._-]+"
                title="Project name can only contain letters, numbers, dots, hyphens, and underscores"
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff6b35] transition-colors"
                placeholder="my-awesome-app"
                disabled={loading || polling}
              />
            </div>

            {detecting ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-[#ff6b35] border-t-transparent rounded-full animate-spin"></div>
                Detecting environment variables...
              </div>
            ) : detectedEnvVars.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Environment Variables
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detectedEnvVars.map((varName) => (
                    <div key={varName} className="flex gap-2">
                      <input
                        type="text"
                        value={varName}
                        disabled
                        className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded text-gray-500 text-sm"
                      />
                      <input
                        type="text"
                        value={envVars[varName] || ''}
                        onChange={(e) => handleEnvVarChange(varName, e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#ff6b35] transition-colors"
                        disabled={loading || polling}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  These environment variables were detected in your code. Leave empty if not needed.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-900/30 text-red-300 border border-red-500/50 text-sm">
                {error}
              </div>
            )}

            {deploymentStatus === 'deploying' && (
              <div className="p-4 rounded-lg bg-blue-900/30 text-blue-300 border border-blue-500/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-semibold">Deploying to Vercel...</span>
                </div>
                <div className="text-sm">
                  {polling ? 'Building and deploying your app...' : 'Creating project...'}
                </div>
                {deploymentUrl && (
                  <div className="text-xs mt-2 opacity-75">
                    Preview URL: <span className="font-mono">{deploymentUrl}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || polling}
                className="flex-1 px-6 py-3 bg-[#333] hover:bg-[#444] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || polling || !deploymentName.trim()}
                className="flex-1 px-6 py-3 bg-[#ff6b35] hover:bg-[#ff7b45] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading || polling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {polling ? 'Deploying...' : 'Starting...'}
                  </>
                ) : (
                  <>
                    <span>▲</span>
                    Deploy to Vercel
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

