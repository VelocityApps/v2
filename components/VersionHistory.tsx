'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Checkpoint {
  id: string;
  project_id: string;
  code: string;
  messages: any[];
  name: string | null;
  description: string | null;
  created_at: string;
}

interface VersionHistoryProps {
  projectId: string | null;
  onRestore: (code: string, messages: any[]) => void;
  onClose: () => void;
}

export default function VersionHistory({ projectId, onRestore, onClose }: VersionHistoryProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkpointName, setCheckpointName] = useState('');
  const [checkpointDescription, setCheckpointDescription] = useState('');

  useEffect(() => {
    if (projectId) {
      loadCheckpoints();
    }
  }, [projectId]);

  const loadCheckpoints = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_checkpoints')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCheckpoints(data || []);
    } catch (error: any) {
      console.error('Error loading checkpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCheckpoint = async (code: string, messages: any[]) => {
    if (!projectId || !code.trim()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('project_checkpoints')
        .insert({
          project_id: projectId,
          user_id: user.id,
          code,
          messages,
          name: checkpointName || null,
          description: checkpointDescription || null,
        });

      if (error) throw error;

      setCheckpointName('');
      setCheckpointDescription('');
      await loadCheckpoints();
    } catch (error: any) {
      console.error('Error creating checkpoint:', error);
      alert('Failed to create checkpoint: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = (checkpoint: Checkpoint) => {
    onRestore(checkpoint.code, checkpoint.messages);
    onClose();
  };

  const handleDelete = async (checkpointId: string) => {
    if (!confirm('Delete this checkpoint?')) return;

    try {
      const { error } = await supabase
        .from('project_checkpoints')
        .delete()
        .eq('id', checkpointId);

      if (error) throw error;
      await loadCheckpoints();
    } catch (error: any) {
      console.error('Error deleting checkpoint:', error);
      alert('Failed to delete checkpoint: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Version History</h2>
            <p className="text-sm text-gray-400 mt-1">Save and restore code checkpoints</p>
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

        {/* Checkpoint List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#0066cc] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : checkpoints.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No checkpoints yet</p>
              <p className="text-sm text-gray-500 mt-2">Create a checkpoint to save your current code state</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkpoints.map((checkpoint) => (
                <div
                  key={checkpoint.id}
                  className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4 hover:border-[#0066cc] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">
                        {checkpoint.name || `Checkpoint ${new Date(checkpoint.created_at).toLocaleString()}`}
                      </h3>
                      {checkpoint.description && (
                        <p className="text-sm text-gray-400 mt-1">{checkpoint.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(checkpoint.created_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {checkpoint.code.length} characters • {checkpoint.messages?.length || 0} messages
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestore(checkpoint)}
                        className="px-3 py-1.5 bg-[#0066cc] hover:bg-[#2980b9] text-white text-sm rounded-lg transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(checkpoint.id)}
                        className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-red-500/20 text-red-400 text-sm rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Create Checkpoint */}
        <div className="px-6 py-4 border-t border-[#333] bg-[#0a0a0a] space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Checkpoint name (optional)"
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc] text-sm"
            />
            <button
              onClick={() => {
                // This will be called from parent with current code
                onClose();
              }}
              className="px-4 py-2 bg-[#0066cc] hover:bg-[#2980b9] text-white text-sm rounded-lg transition-colors"
            >
              Save Current
            </button>
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={checkpointDescription}
            onChange={(e) => setCheckpointDescription(e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc] text-sm"
          />
        </div>
      </div>
    </div>
  );
}

