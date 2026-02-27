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
      <div className="my-auto bg-[#1a1a1a] w-full max-w-2xl rounded-2xl border border-[#333] p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Contact Support</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white focus:outline-none focus:border-[#0066cc] transition-colors"
            >
              <option value="low">Low - General question</option>
              <option value="medium">Medium - Need help</option>
              <option value="high">High - Feature not working</option>
              <option value="critical">Critical - Store broken</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#0066cc] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={6}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#0066cc] transition-colors resize-none"
              required
            />
          </div>

          <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 text-sm text-blue-300">
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
              className="flex-1 px-4 py-3 bg-[#333] hover:bg-[#444] text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !subject || !message}
              className="flex-1 px-4 py-3 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

