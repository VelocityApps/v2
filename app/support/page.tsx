'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const FAQS = [
  {
    question: 'How do I connect my Shopify store?',
    answer:
      'Go to your Dashboard and click "Connect Shopify Store". You\'ll be redirected to Shopify to authorise the connection. Once connected, you can install automations from the Marketplace.',
  },
  {
    question: 'How does billing work?',
    answer:
      'Each automation has its own subscription. You pay per automation, per month. Pro plan gives you access to all automations at a flat rate. You can cancel any individual automation at any time — the rest keep running.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. Cancel any automation from your Dashboard at any time. Your subscription ends at the end of the current billing period — no prorated charges, no cancellation fees.',
  },
  {
    question: 'What happens when my trial ends?',
    answer:
      'The automation pauses automatically. Your configuration and data are saved. To resume, just add a payment method from your Dashboard. Nothing is lost.',
  },
  {
    question: 'Why isn\'t my automation sending emails?',
    answer:
      'Check that: (1) your Shopify store is connected in your Dashboard, (2) the automation is enabled, and (3) the automation has received the relevant Shopify event (e.g. a new order for the Welcome Series). If everything looks right, submit a support ticket and we\'ll investigate.',
  },
  {
    question: 'How do automations get triggered?',
    answer:
      'Automations listen to Shopify webhooks in real time. When a relevant event happens in your store (e.g. a checkout is created, an order is fulfilled, inventory changes), the automation processes it immediately. Some automations also run on a schedule via hourly cron jobs.',
  },
  {
    question: 'Can I customise the emails my customers receive?',
    answer:
      'Yes. Each automation has its own configuration — you can set sender name, subject lines, discount percentages, delay times, and more. Open any installed automation from your Dashboard to edit its settings.',
  },
  {
    question: 'Is my Shopify store data secure?',
    answer:
      'Yes. Your Shopify access token is encrypted at rest using AES-256-GCM. We only request the Shopify permissions each automation needs. We never store payment card data. All connections use HTTPS.',
  },
];

type Priority = 'low' | 'medium' | 'high' | 'critical';

export default function SupportPage() {
  const { session } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setLoading(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subject, message, priority }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setSubmitted(true);
      toast.success("Ticket submitted! We'll be in touch shortly.");
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#202223]">
      {/* Hero */}
      <section className="border-b border-[#e1e3e5] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-[#202223] mb-4">How can we help?</h1>
          <p className="text-[#6d7175] text-lg">
            Browse common questions below or contact us directly. We aim to respond to every ticket
            within 4 hours.
          </p>

          {/* SLA chips */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { label: 'Critical', sla: '< 1 hr', color: 'bg-red-50 border-red-200 text-red-700' },
              { label: 'High', sla: '< 2 hrs', color: 'bg-orange-50 border-orange-200 text-orange-700' },
              { label: 'Medium', sla: '< 4 hrs', color: 'bg-amber-50 border-amber-200 text-amber-700' },
              { label: 'Low', sla: '< 24 hrs', color: 'bg-[#e8f0fe] border-[#bfdbfe] text-[#2563eb]' },
            ].map(({ label, sla, color }) => (
              <div
                key={label}
                className={`px-4 py-2 rounded-lg border text-sm font-medium ${color}`}
              >
                {label} · {sla}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-[#202223] mb-6">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="bg-white border border-[#e1e3e5] rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#f6f6f7] transition-colors"
                >
                  <span className="font-medium text-[#202223] pr-4">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 text-[#6d7175] flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 border-t border-[#e1e3e5]">
                    <p className="text-[#6d7175] leading-relaxed pt-4">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact form */}
        <section>
          <h2 className="text-xl font-bold text-[#202223] mb-2">Contact support</h2>
          <p className="text-[#6d7175] mb-8">
            Didn't find your answer? Send us a message and we'll get back to you.
          </p>

          {!session ? (
            <div className="bg-white border border-[#e1e3e5] rounded-xl p-8 text-center">
              <p className="text-[#6d7175] mb-4">Sign in to submit a support ticket.</p>
              <Link
                href="/onboarding"
                className="inline-block px-6 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold transition-colors shadow-sm"
              >
                Sign In
              </Link>
            </div>
          ) : submitted ? (
            <div className="bg-white border border-[#a3e6c4] rounded-xl p-8 text-center">
              <div className="w-12 h-12 bg-[#e3f9e3] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#008060]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#202223] mb-2">Ticket submitted</h3>
              <p className="text-[#6d7175] mb-6">
                We've sent a confirmation to your email. You'll hear from us soon.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setSubject('');
                  setMessage('');
                  setPriority('medium');
                }}
                className="text-sm text-[#2563eb] hover:text-[#1d4ed8] transition-colors font-medium"
              >
                Submit another ticket
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] focus:outline-none focus:border-[#2563eb] transition-colors"
                >
                  <option value="low">Low — general question</option>
                  <option value="medium">Medium — need help with something</option>
                  <option value="high">High — feature not working</option>
                  <option value="critical">Critical — store is broken</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                  className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail. Include any error messages, which automation is affected, and what you've already tried."
                  rows={7}
                  required
                  className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !subject.trim() || !message.trim()}
                className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-sm"
              >
                {loading ? 'Submitting…' : 'Submit Ticket'}
              </button>
            </form>
          )}
        </section>

        {/* Direct contact */}
        <div className="mt-12 pt-12 border-t border-[#e1e3e5] text-center">
          <p className="text-[#8c9196] text-sm">
            Prefer email?{' '}
            <a href="mailto:hello@velocityapps.dev" className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
              hello@velocityapps.dev
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
