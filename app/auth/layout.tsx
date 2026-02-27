import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - VelocityApps',
  description: 'Sign in, reset password, or verify your email.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
