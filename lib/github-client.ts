import { Octokit } from '@octokit/rest';

/**
 * GitHub API Client
 * 
 * Features:
 * - OAuth authentication
 * - Create repositories
 * - Push code with proper structure
 * - Generate comprehensive README
 */

/**
 * Initialize GitHub client with access token
 */
export function getGitHubClient(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  });
}

/**
 * Create a repository and push code to GitHub
 * 
 * @param accessToken - GitHub OAuth access token
 * @param repoName - Name of the repository
 * @param description - Repository description
 * @param code - Generated code to push
 * @param projectDescription - Project description from user prompt
 * @param isPrivate - Whether the repo should be private (default: true)
 */
export async function createRepoAndPush(
  accessToken: string,
  repoName: string,
  description: string,
  code: string,
  projectDescription: string,
  isPrivate: boolean = true
): Promise<{ repoUrl: string; repoFullName: string }> {
  const octokit = getGitHubClient(accessToken);

  try {
    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    const username = user.login;

    // Create repository
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description: description || 'Generated with ForgedApps',
      private: isPrivate,
      auto_init: false,
    });

    const repoFullName = `${username}/${repoName}`;

    // Generate README
    const readme = generateREADME(repoName, projectDescription, code);

    // Create README.md file
    await octokit.repos.createOrUpdateFileContents({
      owner: username,
      repo: repoName,
      path: 'README.md',
      message: 'Initial commit: Add README',
      content: Buffer.from(readme).toString('base64'),
    });

    // Determine file structure based on code content
    const files = parseCodeIntoFiles(code);

    // Create all files
    for (const file of files) {
      await octokit.repos.createOrUpdateFileContents({
        owner: username,
        repo: repoName,
        path: file.path,
        message: `Add ${file.path}`,
        content: Buffer.from(file.content).toString('base64'),
      });
    }

    return {
      repoUrl: repo.html_url,
      repoFullName,
    };
  } catch (error: any) {
    console.error('[GitHubClient] Error creating repo:', error);
    
    if (error.status === 422) {
      throw new Error('Repository name already exists or is invalid. Please choose a different name.');
    }
    
    if (error.status === 401) {
      throw new Error('GitHub authentication failed. Please reconnect your GitHub account.');
    }

    throw new Error(`Failed to create GitHub repository: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Parse code into multiple files based on structure
 */
function parseCodeIntoFiles(code: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  // Check if code contains file markers (e.g., "// File: filename.js")
  const fileMarkerRegex = /(?:^|\n)(?:\/\/|#)\s*File:\s*([^\n]+)\n/g;
  const matches = [...code.matchAll(fileMarkerRegex)];

  if (matches.length > 0) {
    // Multi-file structure
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const fileName = match[1].trim();
      const startIndex = match.index! + match[0].length;
      const endIndex = i < matches.length - 1 ? matches[i + 1].index! : code.length;
      const fileContent = code.substring(startIndex, endIndex).trim();

      files.push({
        path: fileName,
        content: fileContent,
      });
    }
  } else {
    // Single file - determine type and name
    const looksLikeReact = code.includes('React') || code.includes('react');
    const looksLikeHTML = /<html|<body|<!DOCTYPE/i.test(code);
    const looksLikePython = code.includes('def ') || code.includes('import ') || code.includes('from ');
    const looksLikeJS = code.includes('function ') || code.includes('const ') || code.includes('export ');

    let fileName = 'index';
    if (looksLikeReact) {
      fileName = 'App.jsx';
    } else if (looksLikeHTML) {
      fileName = 'index.html';
    } else if (looksLikePython) {
      fileName = 'main.py';
    } else if (looksLikeJS) {
      fileName = 'index.js';
    } else {
      fileName = 'index.js';
    }

    files.push({
      path: fileName,
      content: code,
    });
  }

  return files;
}

/**
 * Generate comprehensive README.md
 */
function generateREADME(
  projectName: string,
  projectDescription: string,
  code: string
): string {
  const looksLikeReact = code.includes('React') || code.includes('react');
  const looksLikeHTML = /<html|<body|<!DOCTYPE/i.test(code);
  const looksLikePython = code.includes('def ') || code.includes('import ');
  const looksLikeNode = code.includes('require(') || code.includes('npm');

  let setupInstructions = '';
  let runInstructions = '';
  let prerequisites = '';

  if (looksLikeReact) {
    prerequisites = '- Node.js (v16 or higher)\n- npm or yarn';
    setupInstructions = `\`\`\`bash
npm install
# or
yarn install
\`\`\``;
    runInstructions = `\`\`\`bash
npm start
# or
yarn start
\`\`\``;
  } else if (looksLikePython) {
    prerequisites = '- Python 3.8 or higher';
    setupInstructions = `\`\`\`bash
# Install dependencies if needed
pip install -r requirements.txt
\`\`\``;
    runInstructions = `\`\`\`bash
python main.py
\`\`\``;
  } else if (looksLikeNode) {
    prerequisites = '- Node.js (v16 or higher)\n- npm or yarn';
    setupInstructions = `\`\`\`bash
npm install
# or
yarn install
\`\`\``;
    runInstructions = `\`\`\`bash
node index.js
# or
npm start
\`\`\``;
  } else if (looksLikeHTML) {
    prerequisites = '- A modern web browser';
    setupInstructions = 'No installation required.';
    runInstructions = 'Simply open `index.html` in your web browser.';
  } else {
    prerequisites = '- A code editor\n- Runtime environment (Node.js, Python, etc.)';
    setupInstructions = 'Follow the instructions in the code comments.';
    runInstructions = 'See the code comments for usage instructions.';
  }

  return `# ${projectName}

${projectDescription || 'A project generated with ForgedApps'}

## Description

${projectDescription || 'This project was automatically generated using ForgedApps, an AI-powered app builder.'}

## Prerequisites

${prerequisites}

## Installation

${setupInstructions}

## Configuration

If this project requires environment variables or configuration, create a \`.env\` file in the root directory with the necessary values.

Example:
\`\`\`env
# Add your environment variables here
API_KEY=your_api_key_here
\`\`\`

## Usage

${runInstructions}

## Project Structure

\`\`\`
.
├── README.md
└── [project files]
\`\`\`

## Development

1. Clone this repository
2. Install dependencies (if applicable)
3. Configure environment variables
4. Run the project locally

## Deployment

### Deploy to Vercel (Recommended for React/Next.js)

1. Install Vercel CLI: \`npm i -g vercel\`
2. Run \`vercel\` in the project directory
3. Follow the prompts

### Deploy to Netlify (Recommended for static sites)

1. Install Netlify CLI: \`npm i -g netlify-cli\`
2. Run \`netlify deploy\` in the project directory
3. Follow the prompts

### Deploy to Railway (Recommended for Node.js/Python)

1. Connect your GitHub repository to Railway
2. Railway will automatically detect and deploy your project

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Built With

**ForgedApps** - AI-powered app builder

Visit [forgedapps.dev](https://forgedapps.dev) to create your own apps!

---

*This project was generated using ForgedApps. For support and updates, visit [forgedapps.dev](https://forgedapps.dev)*
`;
}

/**
 * Get GitHub OAuth authorization URL
 */
export function getGitHubAuthUrl(): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || 
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/github/callback`;

  if (!clientId) {
    throw new Error('GITHUB_CLIENT_ID is not set in environment variables');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo user:email',
    state: generateState(),
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials are not configured');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

/**
 * Get GitHub user info from access token
 */
export async function getGitHubUser(accessToken: string): Promise<{ username: string; email?: string }> {
  const octokit = getGitHubClient(accessToken);
  const { data: user } = await octokit.users.getAuthenticated();
  
  // Try to get email
  let email: string | undefined;
  try {
    const { data: emails } = await octokit.users.listEmailsForAuthenticated();
    const primaryEmail = emails.find(e => e.primary);
    email = primaryEmail?.email || emails[0]?.email;
  } catch (error) {
    // Email scope might not be granted
    console.warn('[GitHubClient] Could not fetch user email:', error);
  }

  return {
    username: user.login,
    email,
  };
}

/**
 * Generate random state for OAuth
 */
function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

