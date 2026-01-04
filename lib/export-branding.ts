/**
 * Helpers for GitHub export branding.
 *
 * Use these when implementing \"Export to GitHub\" so every repo
 * clearly credits ForgedApps and is easy to discover.
 */

export function getExportReadme(appName: string): string {
  const safeName = appName || 'My Forged App';

  return `# ${safeName}

Built with **ForgedApps** – the AI app foundry for founders.

- Website: https://forgedapps.dev
- Build your own app in minutes: https://forgedapps.dev?ref=export

---

## Getting Started

Install dependencies and run the dev server:

\`\`\`bash
npm install
npm run dev
\`\`\`

Then open \`http://localhost:3000\` in your browser.

## About ForgedApps

ForgedApps lets you design, generate, and iterate on full-stack AI apps
in minutes – with auth, billing, and deployment-ready code.

If this project was helpful, consider sharing it with a friend or on Twitter 🙌
\n`;
}

/**
 * Default GitHub repo topics for exported apps.
 * Attach these when creating the repo via the GitHub API.
 */
export function getGitHubTopics(): string[] {
  return ['ai-generated', 'forgedapps', 'ai-app-builder', 'typescript', 'nextjs'];
}


