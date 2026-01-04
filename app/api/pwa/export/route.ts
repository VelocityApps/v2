import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePWAPackage } from '@/lib/pwa-generator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/pwa/export
 * Generate PWA files (manifest.json, service worker, updated HTML)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, appName, shortName, description, themeColor, backgroundColor } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Extract HTML from code (could be React component or raw HTML)
    let htmlCode = code;
    
    // If it's a React component, we need to extract the HTML structure
    // For now, we'll generate a basic HTML wrapper
    if (!htmlCode.includes('<!DOCTYPE html>') && !htmlCode.includes('<html>')) {
      // Assume it's React code, create a basic HTML structure
      htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName || 'My App'}</title>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel">
    ${code}
  </script>
</body>
</html>`;
    }

    // Generate PWA package
    const pwaPackage = generatePWAPackage(htmlCode, {
      appName: appName || 'My App',
      shortName: shortName || 'MyApp',
      description: description || 'A Progressive Web App built with VelocityApps',
      themeColor: themeColor || '#0066cc',
      backgroundColor: backgroundColor || '#ffffff',
    });

    // Add service worker registration to HTML if not present
    if (!htmlCode.includes('serviceWorker.register')) {
      const registrationScript = `<script>${pwaPackage.registrationCode}</script>`;
      if (pwaPackage.updatedHTML.includes('</body>')) {
        pwaPackage.updatedHTML = pwaPackage.updatedHTML.replace(
          '</body>',
          `  ${registrationScript}\n</body>`
        );
      } else {
        pwaPackage.updatedHTML += `\n${registrationScript}`;
      }
    }

    return NextResponse.json({
      success: true,
      files: {
        'index.html': pwaPackage.updatedHTML,
        'manifest.json': pwaPackage.manifest,
        'sw.js': pwaPackage.serviceWorker,
      },
      instructions: [
        '1. Create a folder for your PWA',
        '2. Save index.html, manifest.json, and sw.js to the folder',
        '3. Add icon files: icon-192x192.png and icon-512x512.png',
        '4. Serve via HTTPS (required for PWA)',
        '5. Users can install your app from their browser',
      ],
    });
  } catch (error: any) {
    console.error('Error generating PWA:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PWA' },
      { status: 500 }
    );
  }
}

