'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LandingPage from './landing/page';

export default function Home() {
  const router = useRouter();
  const { session, loading } = useAuth();

  // Show landing page
  return <LandingPage />;
}
