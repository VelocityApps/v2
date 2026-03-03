'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // handled by PostHogPageView
    capture_pageleave: true,
  });
}

function PostHogPageView() {
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.capture('$pageview');
  }, [posthog]);

  return null;
}

function PostHogAuthSync() {
  const { user } = useAuth();
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog) return;

    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        created_at: user.created_at,
      });
    } else {
      posthog.reset();
    }
  }, [user, posthog]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      <PostHogAuthSync />
      {children}
    </PHProvider>
  );
}
