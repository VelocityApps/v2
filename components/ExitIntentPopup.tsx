'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('exit_intent_shown')) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10) {
        setVisible(true);
        sessionStorage.setItem('exit_intent_shown', '1');
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };

    // Small delay so it doesn't fire immediately on page load
    const t = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(t);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => setVisible(false)}>
      <div
        className="relative bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xl leading-none"
        >
          ×
        </button>

        <div className="text-4xl mb-4">🛒</div>

        <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">
          Wait — you might be leaving money behind.
        </h2>
        <p className="text-[var(--text-secondary)] mb-6">
          The average Shopify store loses <span className="font-semibold text-[var(--text-primary)]">70% of carts</span> to abandonment.
          Abandoned Cart Recovery gets up to 15% of them back — automatically.
        </p>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-secondary)]">Cost per month</span>
            <span className="font-semibold text-[var(--text-primary)]">$36</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Avg. monthly recovery</span>
            <span className="font-semibold text-[var(--success)]">£700+</span>
          </div>
        </div>

        <Link
          href="/onboarding"
          onClick={() => setVisible(false)}
          className="block w-full py-3 text-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-semibold transition-colors shadow-sm"
        >
          Start 7-day free trial — no card needed
        </Link>

        <button
          onClick={() => setVisible(false)}
          className="block w-full mt-3 text-center text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          No thanks, I'll leave the money
        </button>
      </div>
    </div>
  );
}
