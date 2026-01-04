'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AutomationCard from '@/components/automations/AutomationCard';

export default function MarketplacePage() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'marketing', 'inventory', 'seo', 'analytics', 'automation'];

  useEffect(() => {
    async function fetchAutomations() {
      try {
        const { data, error } = await supabase
          .from('automations')
          .select('*')
          .eq('active', true)
          .order('user_count', { ascending: false });

        if (error) throw error;
        setAutomations(data || []);
      } catch (error) {
        console.error('Error fetching automations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAutomations();
  }, []);

  const filteredAutomations = automations.filter((auto: any) => 
    selectedCategory === 'all' || auto.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Automation Marketplace</h1>
          <p className="text-gray-400 text-lg">
            Browse 20+ pre-built automations for your Shopify store
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-[#0066cc] text-white'
                  : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#222]'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Automation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAutomations.map((automation: any) => (
            <AutomationCard
              key={automation.id}
              automation={{
                id: automation.id,
                name: automation.name,
                slug: automation.slug,
                description: automation.description,
                category: automation.category,
                price_monthly: automation.price_monthly,
                icon: automation.icon,
                features: automation.features || [],
                user_count: automation.user_count || 0,
                config_schema: automation.config_schema || {},
              }}
              variant="marketplace"
            />
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066cc] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading automations...</p>
          </div>
        ) : filteredAutomations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No automations found in this category.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

