# Archived Code - AI App Builder Components

This directory contains code from the previous "AI app builder" version of VelocityApps that has been archived as part of the pivot to a Shopify automation marketplace.

## What's Archived

### API Routes (`archived/api/`)
- **`generate/`** - Code generation endpoints (Claude/GPT integration)
- **`shopify/deploy/`** - Shopify app deployment system
- **`railway/`** - Railway deployment integration
- **`vercel/`** - Vercel deployment integration
- **`github/export/`** - GitHub code export functionality
- **`pwa/export/`** - PWA export functionality

### Components (`archived/components/`)
- **`preview/`** - Code preview components (PrismaPreview, SQLPreview, ShopifyAppPreview, etc.)
- **`RailwayDeployModal.tsx`** - Railway deployment modal
- **`VercelDeployModal.tsx`** - Vercel deployment modal
- **`DeploymentProgressModal.tsx`** - Deployment progress tracking
- **`ShareCardGenerator.tsx`** - Share card generation
- **`TemplateMarketplace.tsx`** - Template marketplace UI
- **`ComponentLibrary.tsx`** - Component library UI

### Libraries (`archived/lib/`)
- **`anthropic-client.ts`** - Claude API client
- **`openai-client.ts`** - OpenAI/GPT API client
- **`code-type-detector.ts`** - Code type detection utilities
- **`code-analysis.ts`** - Code analysis utilities
- **`preview-actions.ts`** - Preview action handlers
- **`shopify-deploy.ts`** - Shopify deployment logic

## Why Archived?

These components are no longer needed for the Shopify automation marketplace:
- We're not generating code anymore (we're installing pre-built automations)
- We're not deploying apps (automations run server-side)
- We're not showing code previews (users just install and configure)

## Can These Be Deleted?

Yes, if you're certain you won't need them. However, keeping them archived allows you to:
- Reference old functionality if needed
- Potentially reuse code patterns
- Restore features if the product pivots again

## Note

Some components may still be referenced in the codebase. If you encounter import errors, you may need to:
1. Remove the import
2. Remove the component usage
3. Or restore the component if it's still needed

