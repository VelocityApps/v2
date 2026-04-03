'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface AppBridgeContextType {
  app: any | null;
  host: string | null;
  shop: string | null;
  isEmbedded: boolean;
}

const AppBridgeContext = createContext<AppBridgeContextType>({
  app: null,
  host: null,
  shop: null,
  isEmbedded: false,
});

export function AppBridgeProvider({ children }: { children: React.ReactNode }) {
  const [app, setApp] = useState<any | null>(null);
  const searchParams = useSearchParams();

  const hostFromUrl = searchParams.get('host');
  const shopFromUrl = searchParams.get('shop');

  // Persist host/shop in sessionStorage so navigation that loses query params still works
  const host =
    hostFromUrl ||
    (typeof window !== 'undefined' ? sessionStorage.getItem('shopify_host') : null);
  const shop =
    shopFromUrl ||
    (typeof window !== 'undefined' ? sessionStorage.getItem('shopify_shop') : null);

  useEffect(() => {
    if (!host || !shop) return;

    sessionStorage.setItem('shopify_host', host);
    sessionStorage.setItem('shopify_shop', shop);

    // Dynamically import to avoid SSR issues
    import('@shopify/app-bridge').then(({ default: createApp }) => {
      try {
        const instance = createApp({
          apiKey: process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID!,
          host,
          // Don't force-redirect — we serve both embedded and standalone contexts
          forceRedirect: false,
        });
        setApp(instance);
      } catch {
        // App Bridge init can fail if not in an iframe — treat as standalone
      }
    }).catch(() => {});
  }, [host, shop]);

  return (
    <AppBridgeContext.Provider value={{ app, host, shop, isEmbedded: !!host }}>
      {children}
    </AppBridgeContext.Provider>
  );
}

export const useAppBridge = () => useContext(AppBridgeContext);

/**
 * Returns a Shopify session token for authenticating API calls from the
 * embedded context. Falls back to null if App Bridge isn't initialised.
 */
export async function getShopifySessionToken(app: any): Promise<string | null> {
  if (!app) return null;
  try {
    const { getSessionToken } = await import('@shopify/app-bridge/utilities');
    return await getSessionToken(app);
  } catch {
    return null;
  }
}
