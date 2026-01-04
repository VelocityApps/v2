'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'bug' | 'feature_request' | 'love_it' | 'nps';
  npsScore?: number;
}

export default function FeedbackModal({ 
  isOpen, 
  onClose, 
  initialType,
  npsScore: initialNpsScore
}: FeedbackModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState<'bug' | 'feature_request' | 'love_it' | 'nps'>(initialType || 'bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [npsScore, setNpsScore] = useState<number | undefined>(initialNpsScore);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: type === 'nps' ? 'nps' : type,
          message,
          email: email || undefined,
          nps_score: npsScore,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setMessage('');
        setType('bug');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {type === 'nps' ? 'How likely are you to recommend ForgedApps?' : 'Share Your Feedback'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <div className="text-lg text-white mb-2">Thank you!</div>
            <div className="text-sm text-gray-400">Your feedback has been submitted.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {type !== 'nps' && (
              <>
                {/* Quick Options */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('bug')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      type === 'bug'
                        ? 'border-red-500 bg-red-500/20 text-red-300'
                        : 'border-[#333] bg-[#0a0a0a] text-gray-400 hover:border-[#444]'
                    }`}
                  >
                    🐛 Bug
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('feature_request')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      type === 'feature_request'
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                        : 'border-[#333] bg-[#0a0a0a] text-gray-400 hover:border-[#444]'
                    }`}
                  >
                    💡 Feature
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('love_it')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      type === 'love_it'
                        ? 'border-green-500 bg-green-500/20 text-green-300'
                        : 'border-[#333] bg-[#0a0a0a] text-gray-400 hover:border-[#444]'
                    }`}
                  >
                    ❤️ Love it!
                  </button>
                </div>
              </>
            )}

            {/* NPS Score Input */}
            {type === 'nps' && (
              <div>
                <div className="text-sm text-gray-400 mb-3">Rate from 0 (not likely) to 10 (very likely)</div>
                <div className="grid grid-cols-11 gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setNpsScore(score)}
                      className={`px-2 py-2 rounded text-xs font-medium transition-all ${
                        npsScore === score
                          ? 'bg-[#ff6b35] text-white'
                          : 'bg-[#0a0a0a] border border-[#333] text-gray-400 hover:border-[#ff6b35]'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                {npsScore !== undefined && npsScore < 7 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      What can we improve?
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff6b35] transition-colors"
                      placeholder="Tell us what we can do better..."
                      rows={3}
                    />
                  </div>
                )}
                {npsScore !== undefined && npsScore >= 9 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Would you like to leave a testimonial?
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff6b35] transition-colors"
                      placeholder="Share your experience with ForgedApps..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Message Text Area */}
            {type !== 'nps' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {type === 'bug' && 'Describe the bug'}
                  {type === 'feature_request' && 'Describe your feature idea'}
                  {type === 'love_it' && 'What do you love about ForgedApps?'}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required={type !== 'love_it'}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff6b35] transition-colors"
                  placeholder={
                    type === 'bug' 
                      ? 'What happened? What did you expect?'
                      : type === 'feature_request'
                      ? 'Describe your feature idea in detail...'
                      : 'Tell us what you love!'
                  }
                  rows={4}
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email (optional - for follow-up)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff6b35] transition-colors"
                placeholder="your@email.com"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/30 text-red-300 border border-red-500/50 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (type === 'nps' && npsScore === undefined)}
              className="w-full px-6 py-3 bg-[#ff6b35] hover:bg-[#ff7b45] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

