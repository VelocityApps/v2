import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function PreviewPage({ params }: { params: { id: string } }) {
  // Query by id (the preview ID in the URL path)
  const { data: preview, error } = await supabaseAdmin
    .from('share_previews')
    .select('*')
    .eq('id', params.id)
    .single();
  
  // If not found by id, try querying by the full preview_url as fallback
  // (in case the ID is actually stored in preview_url somehow)
  let previewData = preview;
  if ((error || !preview) && params.id) {
    const { data: fallbackPreview } = await supabaseAdmin
      .from('share_previews')
      .select('*')
      .eq('preview_url', `${process.env.NEXT_PUBLIC_APP_URL || 'https://velocityapps.dev'}/preview/${params.id}`)
      .single();
    previewData = fallbackPreview;
  } else {
    previewData = preview;
  }

  if (!previewData || new Date(previewData.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Preview Not Found</h1>
          <p className="text-gray-400">This preview link has expired or doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Track view
  await supabaseAdmin
    .from('share_previews')
    .update({ view_count: (previewData.view_count || 0) + 1 })
    .eq('id', previewData.id);

  // Track analytics
  await supabaseAdmin
    .from('monitoring_events')
    .insert({
      event_type: 'share',
      event_data: {
        type: 'link_clicked',
        previewId: previewData.id,
        timestamp: new Date().toISOString(),
      },
    });

  return (
    <html lang="en">
      <head>
        <title>Check out my app built with VelocityApps</title>
        <meta name="description" content="Built in seconds with AI" />
        <meta property="og:title" content="Check out my app built with VelocityApps" />
        <meta property="og:description" content="Built in seconds with AI" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_APP_URL}/preview/${params.id}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <style>{`
          body {
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, sans-serif;
            background: #0a0a0a;
            color: #fff;
          }
          #root {
            min-height: 100vh;
            padding: 16px;
          }
        `}</style>
      </head>
      <body>
        <div id="root">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>Built with VelocityApps</h1>
              <p style={{ color: '#999' }}>Preview expires in {Math.ceil((new Date(previewData.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days</p>
            </div>
            <div style={{ 
              background: '#1a1a1a', 
              borderRadius: '8px', 
              padding: '20px',
              marginBottom: '20px'
            }}>
              <pre style={{ 
                color: '#fff', 
                fontFamily: 'monospace', 
                fontSize: '12px',
                overflow: 'auto',
                textAlign: 'left'
              }}>
                {previewData.code.substring(0, 500)}...
              </pre>
            </div>
            <a 
              href="https://velocityapps.dev" 
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: 'linear-gradient(to right, #0066cc, #3498db)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}
            >
              Build yours at VelocityApps.dev
            </a>
          </div>
        </div>
        <script type="text/babel" dangerouslySetInnerHTML={{ __html: previewData.code }} />
      </body>
    </html>
  );
}

