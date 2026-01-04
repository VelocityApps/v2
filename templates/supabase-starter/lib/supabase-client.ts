/**
 * Supabase Client (Client-side)
 * For use in React components and client-side code
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createBrowserClient } from '@supabase/ssr';

// For App Router (Next.js 13+)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// For Pages Router (legacy)
export const supabase = createClientComponentClient();

