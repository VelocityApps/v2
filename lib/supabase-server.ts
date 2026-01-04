import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key for admin operations
// Try to get from environment, fallback to reading .env.local directly
// 
// WARNING: This module uses Node.js built-ins (fs, path) and should only be
// imported server-side. Use dynamic imports in client components.

// Early check to prevent client-side evaluation
if (typeof window !== 'undefined') {
  throw new Error(
    'supabase-server.ts cannot be imported in client components. ' +
    'Use dynamic imports or API routes for server-side Supabase operations.'
  );
}

function loadEnvVars() {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // Fallback: Read directly from .env.local if not in process.env (server-side only)
  if (typeof window === 'undefined') {
    // Try dotenv first (if available)
    try {
      const dotenv = require('dotenv');
      const path = require('path');
      const envPath = path.join(process.cwd(), '.env.local');
      console.log('[supabase-server] Attempting to load .env.local from:', envPath);
      const result = dotenv.config({ path: envPath });
      if (result.parsed) {
        supabaseUrl = result.parsed.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
        supabaseServiceKey = result.parsed.SUPABASE_SERVICE_ROLE_KEY || supabaseServiceKey;
        if (supabaseServiceKey && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
          console.log('[supabase-server] ✅ Loaded SUPABASE_SERVICE_ROLE_KEY via dotenv');
        }
      } else if (result.error) {
        console.warn('[supabase-server] dotenv error:', result.error.message);
      }
    } catch (e: any) {
      console.warn('[supabase-server] dotenv not available or failed:', e.message);
    }

    // Manual fallback: Read .env.local directly
    if (!supabaseServiceKey || !supabaseUrl) {
      try {
        // Use dynamic require to prevent bundler from including fs in client bundle
        const fs = (() => {
          try {
            return require('fs');
          } catch {
            return null;
          }
        })();
        const path = (() => {
          try {
            return require('path');
          } catch {
            return null;
          }
        })();
        
        if (!fs || !path) {
          throw new Error('fs or path modules not available');
        }
        
        const envPath = path.join(process.cwd(), '.env.local');
        
        console.log('[supabase-server] Attempting manual fallback, checking:', envPath);
        
        if (fs.existsSync(envPath)) {
          console.log('[supabase-server] .env.local file exists, reading...');
          const envContent = fs.readFileSync(envPath, 'utf8');
          const lines = envContent.split(/\r?\n/);
          
          console.log('[supabase-server] Found', lines.length, 'lines in .env.local');
          
          let foundServiceKey = false;
          let foundUrl = false;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (trimmed.startsWith('#') || !trimmed) continue;
            
            // Parse SUPABASE_SERVICE_ROLE_KEY
            if (!supabaseServiceKey && trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY')) {
              const match = trimmed.match(/^SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)$/);
              if (match && match[1]) {
                let value = match[1].trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                  value = value.slice(1, -1);
                }
                if (value) {
                  supabaseServiceKey = value;
                  foundServiceKey = true;
                  console.log('[supabase-server] ✅ Loaded SUPABASE_SERVICE_ROLE_KEY from .env.local (manual fallback) - Line', i + 1, '- Length:', value.length);
                  if (supabaseUrl) break; // If we have both, we're done
                } else {
                  console.warn('[supabase-server] ⚠️ Found SUPABASE_SERVICE_ROLE_KEY on line', i + 1, 'but value is empty');
                }
              }
            }
            
            // Parse NEXT_PUBLIC_SUPABASE_URL
            if (!supabaseUrl && trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL')) {
              const match = trimmed.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)$/);
              if (match && match[1]) {
                let value = match[1].trim();
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                  value = value.slice(1, -1);
                }
                if (value) {
                  supabaseUrl = value;
                  foundUrl = true;
                  console.log('[supabase-server] ✅ Loaded NEXT_PUBLIC_SUPABASE_URL from .env.local (manual fallback) - Line', i + 1);
                  if (supabaseServiceKey) break; // If we have both, we're done
                }
              }
            }
          }
          
          if (!foundServiceKey && !supabaseServiceKey) {
            console.error('[supabase-server] ❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local file');
            console.error('[supabase-server] Searched', lines.length, 'lines. Make sure the key is on its own line with format: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
          }
          if (!foundUrl && !supabaseUrl) {
            console.error('[supabase-server] ❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local file');
          }
        } else {
          console.error('[supabase-server] ❌ .env.local file does not exist at:', envPath);
          console.error('[supabase-server] Current working directory:', process.cwd());
        }
      } catch (error: any) {
        console.error('[supabase-server] ❌ Error reading .env.local:', error.message);
        console.error('[supabase-server] Stack:', error.stack);
      }
    }
  }

  return { supabaseUrl, supabaseServiceKey };
}

const { supabaseUrl, supabaseServiceKey } = loadEnvVars();

// Debug logging
if (typeof window === 'undefined') {
  console.log('[supabase-server] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `SET (${supabaseUrl.length} chars)` : 'MISSING');
  console.log('[supabase-server] SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `SET (${supabaseServiceKey.length} chars)` : 'MISSING');
  if (!supabaseServiceKey) {
    console.error('[supabase-server] ❌ SUPABASE_SERVICE_ROLE_KEY is MISSING!');
    console.error('[supabase-server] Check .env.local file exists and contains: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
    console.error('[supabase-server] Current working directory:', process.cwd());
    console.error('[supabase-server] Process env keys with SUPABASE:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ') || 'NONE');
  }
}

// Create client - loadEnvVars() should have already loaded the keys
if (!supabaseUrl) {
  const allEnvKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE'));
  throw new Error(
    '❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local\n' +
    '   Get it from: Supabase Dashboard → Settings → API → Project URL\n' +
    '   Found env vars: ' + (allEnvKeys.join(', ') || 'NONE') + '\n' +
    '   Current directory: ' + process.cwd()
  );
}

if (!supabaseServiceKey) {
  const allEnvKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE'));
  
  // Only check file system on server-side to avoid bundling fs in client
  let fileExists = false;
  let envPath = '';
  if (typeof window === 'undefined') {
    try {
      // Use dynamic require to prevent bundler from including fs in client bundle
      const path = (() => {
        try {
          return require('path');
        } catch {
          return null;
        }
      })();
      const fs = (() => {
        try {
          return require('fs');
        } catch {
          return null;
        }
      })();
      
      if (path && fs) {
        envPath = path.join(process.cwd(), '.env.local');
        fileExists = fs.existsSync(envPath);
      }
    } catch (e) {
      // fs not available (client-side), skip file check
    }
  }
  
  throw new Error(
    '❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local\n' +
    '   Get it from: Supabase Dashboard → Settings → API → service_role key\n' +
    '   ⚠️  This is a SECRET key - keep it safe!\n' +
    '   Found env vars: ' + (allEnvKeys.join(', ') || 'NONE') + '\n' +
    (envPath ? '   .env.local exists: ' + (fileExists ? 'YES' : 'NO') + '\n' +
    '   .env.local path: ' + envPath + '\n' +
    '   Current directory: ' + process.cwd() + '\n' : '') +
    '   See QUICK_FIX.md for detailed instructions.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
