'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  name: string;
  code: string;
  messages: any[];
  created_at: string;
  updated_at: string;
}

interface ProjectsSidebarProps {
  onLoadProject: (project: Project) => void;
  currentProjectId: string | null;
  onProjectDeleted?: () => void;
}

export default function ProjectsSidebar({ onLoadProject, currentProjectId, onProjectDeleted }: ProjectsSidebarProps) {
  const { user, session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session]);

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

    setDeletingId(projectId);
    setDeleteError(null);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user?.id);

      if (error) throw error;
      setProjects(projects.filter(p => p.id !== projectId));
      if (onProjectDeleted && currentProjectId === projectId) {
        onProjectDeleted();
      }
    } catch (error: any) {
      console.error('Error deleting project:', error);
      setDeleteError('Failed to delete project. Please try again.');
      setTimeout(() => setDeleteError(null), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  // Expose refresh function via effect
  useEffect(() => {
    // This will refresh when currentProjectId changes (after save)
    if (session) {
      fetchProjects();
    }
  }, [currentProjectId]);

  if (loading) {
    return (
      <div className="w-56 bg-gradient-to-b from-[#141414] to-[#0a0a0a] border-r border-[#2a2a2a] p-4 flex flex-col items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#1a1a1a]/50 border border-[#2a2a2a]">
          <div className="w-8 h-8 border-3 border-[#0066cc] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-gray-400">Loading projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-56 bg-gradient-to-b from-[#141414] to-[#0a0a0a] border-r border-[#2a2a2a] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#0066cc]/20 to-[#0066cc]/5 border border-[#0066cc]/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[#0066cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-white">Projects</h2>
        </div>
      </div>
      
      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-2">
        {deleteError && (
          <div className="mx-1 mb-2 p-3 rounded-xl bg-gradient-to-br from-red-900/20 to-red-900/5 border border-red-500/30 text-red-300 text-xs">
            {deleteError}
          </div>
        )}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#2a2a2a] flex items-center justify-center mb-4">
              <span className="text-3xl">📁</span>
            </div>
            <div className="text-sm font-medium text-gray-300 mb-1">No projects yet</div>
            <div className="text-xs text-gray-500 leading-relaxed">
              Create your first project by clicking "Save Project" above
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onLoadProject(project)}
                className={`p-3 rounded-xl cursor-pointer transition-all group ${
                  currentProjectId === project.id
                    ? 'bg-gradient-to-br from-[#0066cc]/20 to-[#0066cc]/5 border border-[#0066cc]/30'
                    : 'bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#444]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {project.name}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    disabled={deletingId === project.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete project"
                  >
                    {deletingId === project.id ? (
                      <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin inline-block"></span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
