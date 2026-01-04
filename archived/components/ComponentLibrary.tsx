'use client';

import { useState } from 'react';
import { COMPONENT_LIBRARY, Component, getComponentsByCategory, searchComponents } from '@/lib/component-library';

interface ComponentLibraryProps {
  onInsertComponent: (code: string) => void;
  onClose: () => void;
}

export default function ComponentLibrary({ onInsertComponent, onClose }: ComponentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Component['category'] | 'all'>('all');
  const [draggedComponent, setDraggedComponent] = useState<Component | null>(null);

  const categories: Component['category'][] = ['button', 'form', 'card', 'input', 'layout', 'navigation', 'feedback'];

  let filteredComponents = COMPONENT_LIBRARY;
  if (searchQuery) {
    filteredComponents = searchComponents(searchQuery);
  } else if (selectedCategory !== 'all') {
    filteredComponents = getComponentsByCategory(selectedCategory);
  }

  const handleDragStart = (component: Component) => {
    setDraggedComponent(component);
  };

  const handleDragEnd = () => {
    setDraggedComponent(null);
  };

  const handleInsert = (component: Component) => {
    onInsertComponent(component.code);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Component Library</h2>
            <p className="text-sm text-gray-400 mt-1">Drag and drop components into your code</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-[#333] space-y-3">
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#0066cc] text-white'
                  : 'bg-[#0a0a0a] text-gray-400 hover:bg-[#222]'
              }`}
            >
              All
            </button>
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

        {/* Component List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredComponents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No components found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredComponents.map((component) => (
                <div
                  key={component.id}
                  draggable
                  onDragStart={() => handleDragStart(component)}
                  onDragEnd={handleDragEnd}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 hover:border-[#0066cc] transition-colors cursor-move group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white">{component.name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{component.category}</p>
                    </div>
                    <button
                      onClick={() => handleInsert(component)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 bg-[#0066cc] hover:bg-[#2980b9] rounded transition-all"
                      title="Insert component"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{component.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {component.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[#1a1a1a] text-xs text-gray-500 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#333] bg-[#0a0a0a]">
          <p className="text-xs text-gray-500 text-center">
            Click "Insert" or drag components to add them to your code
          </p>
        </div>
      </div>
    </div>
  );
}

