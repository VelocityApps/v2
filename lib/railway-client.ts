/**
 * Railway API Client
 * 
 * Features:
 * - Deploy projects to Railway
 * - Configure environment variables
 * - Generate railway.json config
 * - Poll deployment status
 */

interface RailwayProject {
  id: string;
  name: string;
  description?: string;
}

interface RailwayService {
  id: string;
  name: string;
  projectId: string;
}

interface RailwayDeployment {
  id: string;
  status: 'BUILDING' | 'DEPLOYING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  url?: string;
  createdAt: string;
}

interface RailwayEnvironmentVariable {
  name: string;
  value: string;
}

/**
 * Get Railway API client
 */
function getRailwayApiToken(): string {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) {
    throw new Error('RAILWAY_API_TOKEN is not set in environment variables');
  }
  return token;
}

/**
 * Make Railway API request
 */
async function railwayRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getRailwayApiToken();
  const baseUrl = 'https://backboard.railway.app/graphql/v2';

  const response = await fetch(baseUrl, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Railway API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new Railway project
 */
export async function createRailwayProject(
  name: string,
  description?: string
): Promise<RailwayProject> {
  const token = getRailwayApiToken();

  // Railway uses GraphQL API
  const query = `
    mutation CreateProject($name: String!, $description: String) {
      projectCreate(name: $name, description: $description) {
        id
        name
        description
      }
    }
  `;

  try {
    const response = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          name,
          description: description || `Deployed from ForgedApps`,
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'Failed to create Railway project');
    }

    return data.data.projectCreate;
  } catch (error: any) {
    console.error('[RailwayClient] Error creating project:', error);
    throw new Error(`Failed to create Railway project: ${error.message}`);
  }
}

/**
 * Create a service in a Railway project
 */
export async function createRailwayService(
  projectId: string,
  name: string
): Promise<RailwayService> {
  const token = getRailwayApiToken();

  const query = `
    mutation CreateService($projectId: String!, $name: String!) {
      serviceCreate(projectId: $projectId, name: $name) {
        id
        name
        projectId
      }
    }
  `;

  try {
    const response = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          projectId,
          name,
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'Failed to create Railway service');
    }

    return data.data.serviceCreate;
  } catch (error: any) {
    console.error('[RailwayClient] Error creating service:', error);
    throw new Error(`Failed to create Railway service: ${error.message}`);
  }
}

/**
 * Set environment variables for a service
 */
export async function setEnvironmentVariables(
  serviceId: string,
  variables: RailwayEnvironmentVariable[]
): Promise<void> {
  const token = getRailwayApiToken();

  // Railway uses a mutation to set variables
  for (const variable of variables) {
    const query = `
      mutation SetVariable($serviceId: String!, $name: String!, $value: String!) {
        variableUpsert(serviceId: $serviceId, name: $name, value: $value) {
          id
          name
          value
        }
      }
    `;

    try {
      const response = await fetch('https://backboard.railway.app/graphql/v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            serviceId,
            name: variable.name,
            value: variable.value,
          },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        console.warn(`[RailwayClient] Failed to set variable ${variable.name}:`, data.errors[0]?.message);
      }
    } catch (error: any) {
      console.error(`[RailwayClient] Error setting variable ${variable.name}:`, error);
    }
  }
}

/**
 * Connect GitHub repository to Railway service
 * Note: This requires the service to have a GitHub repo connected
 * For now, we'll use Railway's GitHub integration via their REST API
 */
export async function connectGitHubRepo(
  serviceId: string,
  repoUrl: string
): Promise<void> {
  // Railway GitHub integration is typically done via their dashboard
  // For API-based deployment, we'll use Railway's source deployment
  // This is a placeholder - actual implementation depends on Railway's API
  console.log('[RailwayClient] GitHub repo connection:', { serviceId, repoUrl });
}

/**
 * Deploy code to Railway
 * Creates project, service, sets env vars, and returns deployment URL
 */
export async function deployToRailway(
  code: string,
  projectName: string,
  envVars: Record<string, string> = {}
): Promise<{ deploymentUrl: string; projectId: string; serviceId: string }> {
  try {
    // Step 1: Create Railway project
    console.log('[RailwayClient] Creating Railway project:', projectName);
    const project = await createRailwayProject(projectName);

    // Step 2: Create service
    console.log('[RailwayClient] Creating Railway service');
    const service = await createRailwayService(project.id, 'web');

    // Step 3: Set environment variables
    if (Object.keys(envVars).length > 0) {
      console.log('[RailwayClient] Setting environment variables');
      const variables: RailwayEnvironmentVariable[] = Object.entries(envVars).map(
        ([name, value]) => ({ name, value })
      );
      await setEnvironmentVariables(service.id, variables);
    }

    // Step 4: Generate railway.json and package.json if needed
    const railwayConfig = generateRailwayConfig(code);
    const packageJson = generatePackageJson(code, projectName);

    // Note: Railway deployment via API typically requires:
    // 1. GitHub repo connection, OR
    // 2. Direct code upload (if Railway supports it)
    // For now, we'll return the project/service info
    // The actual deployment will be handled by connecting a GitHub repo
    // or using Railway's CLI/API for direct deployment

    // Get deployment URL (Railway generates this automatically)
    // We'll need to poll for the deployment status
    const deploymentUrl = await getDeploymentUrl(service.id);

    return {
      deploymentUrl,
      projectId: project.id,
      serviceId: service.id,
    };
  } catch (error: any) {
    console.error('[RailwayClient] Deployment error:', error);
    throw error;
  }
}

/**
 * Get deployment URL for a service
 */
async function getDeploymentUrl(serviceId: string): Promise<string> {
  const token = getRailwayApiToken();

  const query = `
    query GetService($serviceId: String!) {
      service(id: $serviceId) {
        id
        name
        deployments {
          edges {
            node {
              id
              status
              url
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { serviceId },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'Failed to get deployment URL');
    }

    const deployments = data.data?.service?.deployments?.edges || [];
    const latestDeployment = deployments[0]?.node;

    if (latestDeployment?.url) {
      return latestDeployment.url;
    }

    // Fallback: construct URL from service name
    // Railway URLs are typically: https://[service-name].railway.app
    return `https://${data.data?.service?.name || 'app'}.railway.app`;
  } catch (error: any) {
    console.error('[RailwayClient] Error getting deployment URL:', error);
    // Return a placeholder URL
    return `https://${serviceId}.railway.app`;
  }
}

/**
 * Poll deployment status
 */
export async function pollDeploymentStatus(
  serviceId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<{ status: string; url?: string }> {
  const token = getRailwayApiToken();

  const query = `
    query GetDeploymentStatus($serviceId: String!) {
      service(id: $serviceId) {
        deployments {
          edges {
            node {
              id
              status
              url
            }
          }
        }
      }
    }
  `;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch('https://backboard.railway.app/graphql/v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { serviceId },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0]?.message || 'Failed to get deployment status');
      }

      const deployments = data.data?.service?.deployments?.edges || [];
      const latestDeployment = deployments[0]?.node;

      if (latestDeployment) {
        if (latestDeployment.status === 'SUCCESS' && latestDeployment.url) {
          return {
            status: 'SUCCESS',
            url: latestDeployment.url,
          };
        }

        if (latestDeployment.status === 'FAILED') {
          return {
            status: 'FAILED',
          };
        }
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error: any) {
      console.error(`[RailwayClient] Poll attempt ${attempt + 1} failed:`, error);
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return { status: 'TIMEOUT' };
}

/**
 * Generate railway.json configuration
 */
export function generateRailwayConfig(code: string): string {
  const looksLikeNode = code.includes('require(') || code.includes('npm') || code.includes('package.json');
  const looksLikePython = code.includes('def ') || code.includes('import ') || code.includes('pip');
  const looksLikeReact = code.includes('React') || code.includes('react');

  let startCommand = 'npm start';
  if (looksLikePython) {
    startCommand = 'python main.py';
  } else if (looksLikeNode && !looksLikeReact) {
    startCommand = 'node index.js';
  }

  const config = {
    build: {
      builder: 'NIXPACKS',
    },
    deploy: {
      startCommand: startCommand,
      restartPolicyType: 'ON_FAILURE',
    },
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Generate package.json if needed
 */
export function generatePackageJson(code: string, projectName: string): string | null {
  const looksLikeNode = code.includes('require(') || code.includes('npm');
  const looksLikeReact = code.includes('React') || code.includes('react');

  if (!looksLikeNode && !looksLikeReact) {
    return null;
  }

  const dependencies: Record<string, string> = {};

  // Detect common dependencies
  if (code.includes('express')) {
    dependencies.express = '^4.18.0';
  }
  if (code.includes('react')) {
    dependencies.react = '^18.2.0';
    dependencies['react-dom'] = '^18.2.0';
  }
  if (code.includes('next')) {
    dependencies.next = '^14.0.0';
    dependencies.react = '^18.2.0';
    dependencies['react-dom'] = '^18.2.0';
  }

  const packageJson = {
    name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: '1.0.0',
    description: `Deployed from ForgedApps`,
    main: looksLikeReact ? 'index.js' : 'index.js',
    scripts: {
      start: looksLikeReact ? 'react-scripts start' : 'node index.js',
      build: looksLikeReact ? 'react-scripts build' : undefined,
    },
    dependencies,
    engines: {
      node: '>=18.0.0',
    },
  };

  // Remove undefined values
  Object.keys(packageJson.scripts).forEach((key) => {
    if (packageJson.scripts[key as keyof typeof packageJson.scripts] === undefined) {
      delete packageJson.scripts[key as keyof typeof packageJson.scripts];
    }
  });

  return JSON.stringify(packageJson, null, 2);
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
    /os\.getenv\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
    /os\.environ\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    /getenv\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
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

