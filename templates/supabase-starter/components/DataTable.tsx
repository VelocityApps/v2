'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

interface Item {
  id: string;
  title: string;
  description: string;
  created_at: string;
  user_id: string;
}

export default function DataTable() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });

  useEffect(() => {
    loadItems();
    subscribeToChanges();
  }, []);

  const loadItems = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading items:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const subscribeToChanges = () => {
    const supabase = createClient();
    
    supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
        },
        (payload) => {
          console.log('Change received!', payload);
          loadItems();
        }
      )
      .subscribe();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase
      .from('items')
      .insert({
        title: formData.title,
        description: formData.description,
        user_id: user.id,
      });

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setFormData({ title: '', description: '' });
      setShowAddForm(false);
      loadItems();
    }
  };

  const handleUpdate = async (id: string, title: string, description: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('items')
      .update({ title, description })
      .eq('id', id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setEditingId(null);
      loadItems();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      loadItems();
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading items...</div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-medium text-gray-900">Items ({items.length})</h4>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          {showAddForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Add Item
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No items yet. Click "Add Item" to create one.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        defaultValue={item.title}
                        onBlur={(e) => {
                          handleUpdate(item.id, e.target.value, item.description);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdate(item.id, e.currentTarget.value, item.description);
                          }
                          if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-indigo-500"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600"
                        onClick={() => setEditingId(item.id)}
                      >
                        {item.title}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === item.id ? (
                      <textarea
                        defaultValue={item.description}
                        onBlur={(e) => {
                          handleUpdate(item.id, item.title, e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                        rows={2}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-indigo-500"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="text-sm text-gray-500 cursor-pointer hover:text-indigo-600"
                        onClick={() => setEditingId(item.id)}
                      >
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

