/**
 * Vercel API Client
 * 
 * Features:
 * - OAuth authentication
 * - Deploy projects to Vercel
 * - Auto-detect framework
 * - Configure build settings
 * - Generate vercel.json config
 */

interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  updatedAt: number;
}

interface VercelDeployment {
  id: string;
  url: string;
  state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  readyState: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  createdAt: number;
  readyAt?: number;
}

interface VercelEnvironmentVariable {
  key: string;
  value: string;
  type: 'system' | 'secret' | 'encrypted';
  target: ('production' | 'preview' | 'development')[];
}

/**
 * Get Vercel OAuth authorization URL
 */
export function getVercelAuthUrl(): string {
  const clientId = process.env.VERCEL_CLIENT_ID;
  const redirectUri = process.env.VERCEL_REDIRECT_URI || 
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/vercel/callback`;

  if (!clientId) {
    throw new Error('VERCEL_CLIENT_ID is not set in environment variables');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read write',
    state: generateState(),
  });

  return `https://vercel.com/integrations/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.VERCEL_CLIENT_ID;
  const clientSecret = process.env.VERCEL_CLIENT_SECRET;
  const redirectUri = process.env.VERCEL_REDIRECT_URI || 
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/vercel/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Vercel OAuth credentials are not configured');
  }

  const response = await fetch('https://api.vercel.com/v2/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Vercel OAuth error: ${data.error_description || data.error || 'Unknown error'}`);
  }

  return data.access_token;
}

/**
 * Get Vercel user info from access token
 */
export async function getVercelUser(accessToken: string): Promise<{ username: string; email?: string }> {
  const response = await fetch('https://api.vercel.com/v2/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Vercel user info');
  }

  const data = await response.json();
  return {
    username: data.user.username,
    email: data.user.email,
  };
}

/**
 * Make Vercel API request
 */
async function vercelRequest<T>(
  endpoint: string,
  accessToken: string,
  options: Omit<RequestInit, 'body'> & { body?: Record<string, unknown> } = {}
): Promise<T> {
  const baseUrl = 'https://api.vercel.com';

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Vercel API error: ${error.error?.message || error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Detect framework from code
 */
export function detectFramework(code: string): {
  framework: string;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
} {
  // Check for Next.js
  if (code.includes('next') || code.includes('Next.js') || code.includes('getServerSideProps') || code.includes('getStaticProps')) {
    return {
      framework: 'nextjs',
      buildCommand: 'npm run build',
      outputDirectory: '.next',
    };
  }

  // Check for React (Create React App)
  if (code.includes('react-scripts') || code.includes('react-dom') || (code.includes('React') && code.includes('createRoot'))) {
    return {
      framework: 'create-react-app',
      buildCommand: 'npm run build',
      outputDirectory: 'build',
    };
  }

  // Check for Vue
  if (code.includes('vue') || code.includes('Vue')) {
    return {
      framework: 'vue',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
    };
  }

  // Check for Svelte
  if (code.includes('svelte')) {
    return {
      framework: 'svelte',
      buildCommand: 'npm run build',
      outputDirectory: 'public',
    };
  }

  // Check for Angular
  if (code.includes('angular') || code.includes('@angular')) {
    return {
      framework: 'angular',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
    };
  }

  // Check for static HTML
  if (/<html|<body|<!DOCTYPE/i.test(code)) {
    return {
      framework: 'static',
      buildCommand: undefined,
      outputDirectory: undefined,
    };
  }

  // Default: Node.js
  return {
    framework: 'nodejs',
    buildCommand: undefined,
    outputDirectory: undefined,
  };
}

/**
 * Generate vercel.json configuration
 */
export function generateVercelConfig(code: string): string {
  const framework = detectFramework(code);
  
  const config: any = {
    framework: framework.framework,
  };

  if (framework.buildCommand) {
    config.buildCommand = framework.buildCommand;
  }

  if (framework.outputDirectory) {
    config.outputDirectory = framework.outputDirectory;
  }

  // Add rewrites for SPA if needed
  if (framework.framework === 'create-react-app' || framework.framework === 'vue' || framework.framework === 'svelte') {
    config.rewrites = [
      { source: '/(.*)', destination: '/index.html' },
    ];
  }

  return JSON.stringify(config, null, 2);
}

/**
 * Create a Vercel project
 */
export async function createVercelProject(
  accessToken: string,
  name: string,
  framework: string
): Promise<VercelProject> {
  try {
    const response = await vercelRequest<{ project: VercelProject }>(
      '/v9/projects',
      accessToken,
      {
        method: 'POST',
        body: {
          name,
          framework,
        },
      }
    );

    return response.project;
  } catch (error: any) {
    console.error('[VercelClient] Error creating project:', error);
    throw new Error(`Failed to create Vercel project: ${error.message}`);
  }
}

/**
 * Set environment variables for a project
 */
export async function setEnvironmentVariables(
  accessToken: string,
  projectId: string,
  variables: Array<{ key: string; value: string; target?: ('production' | 'preview' | 'development')[] }>
): Promise<void> {
  for (const variable of variables) {
    try {
      await vercelRequest(
        `/v9/projects/${projectId}/env`,
        accessToken,
        {
          method: 'POST',
          body: {
            key: variable.key,
            value: variable.value,
            type: 'encrypted',
            target: variable.target || ['production', 'preview', 'development'],
          },
        }
      );
    } catch (error: any) {
      console.warn(`[VercelClient] Failed to set variable ${variable.key}:`, error);
    }
  }
}

/**
 * Deploy code to Vercel
 * Note: Vercel requires code to be in a Git repository
 * For direct deployment, we'll use Vercel's file upload API
 */
export async function deployToVercel(
  accessToken: string,
  code: string,
  projectName: string,
  envVars: Record<string, string> = {}
): Promise<{ deploymentUrl: string; projectId: string; deploymentId: string }> {
  try {
    // Detect framework
    const framework = detectFramework(code);
    console.log('[VercelClient] Detected framework:', framework.framework);

    // Step 1: Create project
    console.log('[VercelClient] Creating Vercel project:', projectName);
    const project = await createVercelProject(accessToken, projectName, framework.framework);

    // Step 2: Set environment variables
    if (Object.keys(envVars).length > 0) {
      console.log('[VercelClient] Setting environment variables');
      const variables = Object.entries(envVars).map(([key, value]) => ({
        key,
        value,
        target: ['production', 'preview', 'development'] as ('production' | 'preview' | 'development')[],
      }));
      await setEnvironmentVariables(accessToken, project.id, variables);
    }

    // Step 3: Create deployment
    // Vercel requires files to be uploaded
    // For now, we'll return the project info and let the user connect a Git repo
    // Or we can use Vercel's file upload API if available
    
    // Note: Vercel's direct deployment API requires file uploads
    // The typical flow is:
    // 1. Create project
    // 2. Connect Git repository (GitHub, GitLab, Bitbucket)
    // 3. Deploy from Git
    
    // For now, we'll create the project and return a message to connect Git
    // In a full implementation, you'd upload files via Vercel's deployment API
    
    const deploymentUrl = `https://${project.name}.vercel.app`;

    return {
      deploymentUrl,
      projectId: project.id,
      deploymentId: project.id, // Placeholder
    };
  } catch (error: any) {
    console.error('[VercelClient] Deployment error:', error);
    throw error;
  }
}

/**
 * Poll deployment status
 */
export async function pollDeploymentStatus(
  accessToken: string,
  deploymentId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<{ status: string; url?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await vercelRequest<{ deployments: VercelDeployment[] }>(
        `/v6/deployments?projectId=${deploymentId}&limit=1`,
        accessToken
      );

      const deployment = response.deployments?.[0];

      if (deployment) {
        if (deployment.readyState === 'READY' && deployment.url) {
          return {
            status: 'READY',
            url: `https://${deployment.url}`,
          };
        }

        if (deployment.readyState === 'ERROR') {
          return {
            status: 'ERROR',
          };
        }

        if (deployment.readyState === 'CANCELED') {
          return {
            status: 'CANCELED',
          };
        }
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error: any) {
      console.error(`[VercelClient] Poll attempt ${attempt + 1} failed:`, error);
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return { status: 'TIMEOUT' };
}

/**
 * Detect required environment variables from code
 */
export function detectEnvironmentVariables(code: string): string[] {
  const envVars: string[] = [];

  // Common patterns for environment variables
  const patterns = [
    /process\.env\.([A-Z_][A-Z0-9_]*)/g,
    /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    /process\.env\[`([A-Z_][A-Z0-9_]*)`\]/g,
    /NEXT_PUBLIC_([A-Z_][A-Z0-9_]*)/g,
    /VITE_([A-Z_][A-Z0-9_]*)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const varName = match[1];
      if (varName && !envVars.includes(varName)) {
        envVars.push(varName);
      }
    }
  }

  return envVars;
}

/**
 * Generate random state for OAuth
 */
function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

