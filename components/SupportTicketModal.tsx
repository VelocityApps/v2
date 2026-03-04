'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  automationId?: string;
  userAutomationId?: string;
}

export default function SupportTicketModal({
  isOpen,
  onClose,
  automationId,
  userAutomationId,
}: SupportTicketModalProps) {
  const { session } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error('Please sign in to submit a support ticket');
      return;
    }

    if (!subject || !message) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    toast.loading('Submitting support ticket...', { id: 'support-ticket' });

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subject,
          message,
          priority,
          automationId,
          userAutomationId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error, { id: 'support-ticket' });
        return;
      }

      toast.success('Support ticket created! We\'ll respond within 2 hours.', { id: 'support-ticket' });
      
      // Reset form
      setSubject('');
      setMessage('');
      setPriority('medium');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create support ticket', { id: 'support-ticket' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-auto bg-white w-full max-w-2xl rounded-2xl border border-[#e1e3e5] shadow-xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#202223]">Contact Support</h2>
          <button
            onClick={onClose}
            className="text-[#6d7175] hover:text-[#202223] transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#202223] mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] focus:outline-none focus:border-[#2563eb] transition-colors"
            >
              <option value="low">Low - General question</option>
              <option value="medium">Medium - Need help</option>
              <option value="high">High - Feature not working</option>
              <option value="critical">Critical - Store broken</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#202223] mb-1.5">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#202223] mb-1.5">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={6}
              className="w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors resize-none"
              required
            />
          </div>

          <div className="bg-[#e8f0fe] border border-[#bfdbfe] rounded-lg p-4 text-sm text-[#1d4ed8]">
            <strong>Response Time SLA:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Critical: &lt;1 hour</li>
              <li>High: &lt;2 hours</li>
              <li>Medium: &lt;4 hours</li>
              <li>Low: &lt;24 hours</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white hover:bg-[#f6f6f7] border border-[#e1e3e5] text-[#202223] rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !subject || !message}
              className="flex-1 px-4 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : null;
}

