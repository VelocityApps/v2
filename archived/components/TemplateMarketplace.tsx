'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Template {
  id: string;
  user_id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  is_paid: boolean;
  price_usd: number;
  download_count: number;
  rating_average: number;
  rating_count: number;
  preview_image_url: string | null;
  tags: string[];
  status: string;
  created_at: string;
}

interface TemplateMarketplaceProps {
  isOpen?: boolean;
  onSelectTemplate: (template: Template) => void;
  onClose: () => void;
  onSubmitTemplate?: () => void;
}

export default function TemplateMarketplace({ isOpen = true, onSelectTemplate, onClose, onSubmitTemplate }: TemplateMarketplaceProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_templates')
        .select('*')
        .eq('is_public', true)
        .eq('status', 'approved')
        .order('download_count', { ascending: false });

      if (error) {
        // If table doesn't exist or RLS blocks, just show empty state
        console.warn('Templates not available:', error.message);
        setTemplates([]);
        return;
      }
      setTemplates(data || []);
    } catch (error: any) {
      // Gracefully handle any errors - show empty state instead of crashing
      console.warn('Error loading templates:', error?.message || error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Template Marketplace</h2>
            <p className="text-sm text-gray-400 mt-1">Browse and use community templates</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSubmitForm(true)}
              className="px-4 py-2 bg-[#0066cc] hover:bg-[#2980b9] text-white text-sm rounded-lg transition-colors"
            >
              Submit Template
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-[#333] space-y-3">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc]"
          />
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors capitalize ${
                  selectedCategory === cat
                    ? 'bg-[#0066cc] text-white'
                    : 'bg-[#0a0a0a] text-gray-400 hover:bg-[#222]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid or Submit Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {showSubmitForm ? (
            <SubmitTemplateForm 
              onClose={() => setShowSubmitForm(false)}
              onSuccess={() => {
                setShowSubmitForm(false);
                loadTemplates();
              }}
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#0066cc] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No templates found</p>
              <button
                onClick={() => setShowSubmitForm(true)}
                className="px-4 py-2 bg-[#0066cc] hover:bg-[#2980b9] text-white rounded-lg transition-colors"
              >
                Be the first to submit a template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 hover:border-[#0066cc] transition-colors cursor-pointer"
                  onClick={() => onSelectTemplate(template)}
                >
                  {template.preview_image_url && (
                    <img
                      src={template.preview_image_url}
                      alt={template.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white">{template.name}</h3>
                    {template.is_paid && (
                      <span className="px-2 py-0.5 bg-[#0066cc] text-white text-xs rounded">
                        ${template.price_usd}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span>⭐</span>
                      <span>{template.rating_average.toFixed(1)} ({template.rating_count})</span>
                    </div>
                    <span>{template.download_count} downloads</span>
                  </div>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-[#1a1a1a] text-xs text-gray-500 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmitTemplateForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to submit a template');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const { error: insertError } = await supabase
        .from('community_templates')
        .insert({
          user_id: user.id,
          name,
          description,
          prompt,
          category: category || null,
          tags: tagsArray,
          is_public: true,
          is_paid: isPaid,
          price_usd: isPaid ? price : 0,
          status: 'pending', // Needs approval
        });

      if (insertError) throw insertError;
      
      onSuccess();
    } catch (err: any) {
      console.error('Error submitting template:', err);
      setError(err.message || 'Failed to submit template');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Submit a Template</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Template Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc]"
            placeholder="e.g., React Todo App"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc]"
            placeholder="Describe what this template does..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Prompt *</label>
          <textarea
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc] font-mono text-sm"
            placeholder="The prompt that will generate this template..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc]"
              placeholder="e.g., Web App, API, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc]"
              placeholder="react, todo, typescript"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="w-4 h-4 text-[#0066cc] bg-[#0a0a0a] border-[#333] rounded focus:ring-[#0066cc]"
            />
            <span className="text-sm text-gray-300">This is a paid template</span>
          </label>
        </div>

        {isPaid && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Price (USD) *</label>
            <input
              type="number"
              required={isPaid}
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc]"
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-[#0066cc] hover:bg-[#2980b9] disabled:bg-[#2a2a2a] disabled:text-gray-500 text-white rounded-lg transition-colors font-medium"
          >
            {submitting ? 'Submitting...' : 'Submit Template'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Templates are reviewed before being published. You'll be notified once approved.
        </p>
      </form>
    </div>
  );
}

