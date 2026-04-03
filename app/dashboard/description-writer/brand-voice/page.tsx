'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function BrandVoicePage() {
  const { session } = useAuth();
  const router = useRouter();

  const [samples, setSamples] = useState(['', '', '']);
  const [analysing, setAnalysing] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (!session) return;
    fetchProfile();
  }, [session]);

  async function fetchProfile() {
    if (!session) return;
    try {
      const res = await fetch('/api/description-writer/brand-voice', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setEditForm(data.profile);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyse() {
    if (!session || analysing) return;
    const filled = samples.filter((s) => s.trim().length > 20);
    if (filled.length < 3) {
      toast.error('Please add at least 3 sample descriptions (minimum 20 characters each).');
      return;
    }
    setAnalysing(true);
    try {
      const res = await fetch('/api/description-writer/brand-voice', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sampleDescriptions: filled }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Analysis failed'); return; }
      setProfile(data.profile);
      setEditForm(data.profile);
      toast.success('Brand voice profile extracted and saved!');
    } catch {
      toast.error('Analysis failed. Please try again.');
    } finally {
      setAnalysing(false);
    }
  }

  async function handleSaveEdits() {
    if (!session || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/description-writer/brand-voice', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Save failed'); return; }
      setProfile(data.profile);
      setEditing(false);
      toast.success('Profile updated.');
    } catch {
      toast.error('Save failed.');
    } finally {
      setSaving(false);
    }
  }

  function addSample() { setSamples((p) => [...p, '']); }
  function removeSample(i: number) { setSamples((p) => p.filter((_, idx) => idx !== i)); }
  function updateSample(i: number, v: string) { setSamples((p) => p.map((s, idx) => idx === i ? v : s)); }

  const renderList = (items: string[], field: string) => (
    <div className="flex flex-wrap gap-1.5">
      {(items ?? []).map((item: string, i: number) => (
        <span key={i} className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full text-xs text-[var(--text-secondary)]">
          {item}
        </span>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/description-writer" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors">← Back</Link>
          <div>
            <h1 className="text-2xl font-bold">Brand Voice Learning</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">Teach Claude your brand's voice — applied to every future generation</p>
          </div>
        </div>

        {/* Saved profile */}
        {profile && !editing && (
          <div className="bg-[var(--bg-primary)] border border-[var(--accent-border)] rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-medium rounded-full">Brand Voice Active</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">Updated {new Date(profile.updated_at).toLocaleDateString('en-GB')}</p>
              </div>
              <button onClick={() => setEditing(true)} className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors">Edit</button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">Tone</p>
                {renderList(profile.tone, 'tone')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Sentence Structure</p>
                  <p className="text-sm text-[var(--text-primary)] capitalize">{profile.sentence_structure}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Vocabulary Level</p>
                  <p className="text-sm text-[var(--text-primary)] capitalize">{profile.vocabulary_level}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">Personality Traits</p>
                {renderList(profile.personality_traits, 'personality_traits')}
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--success)] mb-1.5">Phrases to Use</p>
                {renderList(profile.phrases_to_use, 'phrases_to_use')}
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--error)] mb-1.5">Phrases to Avoid</p>
                {renderList(profile.phrases_to_avoid, 'phrases_to_avoid')}
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">Example Sentences</p>
                <ul className="space-y-1.5">
                  {(profile.example_sentences ?? []).map((s: string, i: number) => (
                    <li key={i} className="text-sm text-[var(--text-secondary)] italic border-l-2 border-[var(--accent)] pl-3">{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-semibold mb-4">Edit Brand Voice Profile</h2>
            <div className="space-y-4">
              {[
                { label: 'Tone (comma-separated)', field: 'tone', isArray: true },
                { label: 'Personality Traits (comma-separated)', field: 'personality_traits', isArray: true },
                { label: 'Phrases to Use (comma-separated)', field: 'phrases_to_use', isArray: true },
                { label: 'Phrases to Avoid (comma-separated)', field: 'phrases_to_avoid', isArray: true },
              ].map(({ label, field, isArray }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
                  <input
                    type="text"
                    value={(editForm[field] ?? []).join(', ')}
                    onChange={(e) => setEditForm((p: any) => ({
                      ...p,
                      [field]: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean),
                    }))}
                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Sentence Structure</label>
                  <select value={editForm.sentence_structure} onChange={(e) => setEditForm((p: any) => ({ ...p, sentence_structure: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                    <option value="short">Short</option>
                    <option value="long">Long</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Vocabulary Level</label>
                  <select value={editForm.vocabulary_level} onChange={(e) => setEditForm((p: any) => ({ ...p, vocabulary_level: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
                    <option value="simple">Simple</option>
                    <option value="technical">Technical</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSaveEdits} disabled={saving}
                className="px-5 py-2 text-sm font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sample input section */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-1">
            {profile ? 'Refine Brand Voice' : 'Analyse Brand Voice'}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-5">
            Paste {profile ? 'additional' : '3–10 of your best'} product descriptions. Claude will extract your brand's unique voice.
          </p>

          <div className="space-y-3 mb-4">
            {samples.map((sample, i) => (
              <div key={i} className="relative">
                <textarea
                  value={sample}
                  onChange={(e) => updateSample(i, e.target.value)}
                  rows={3}
                  placeholder={`Sample description ${i + 1}…`}
                  className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
                {samples.length > 3 && (
                  <button onClick={() => removeSample(i)}
                    className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--error)] text-xs transition-colors">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {samples.length < 10 && (
            <button onClick={addSample} className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium mb-5 transition-colors">
              + Add another sample
            </button>
          )}

          <button onClick={handleAnalyse} disabled={analysing}
            className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {analysing ? (
              <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Analysing…</>
            ) : profile ? 'Refine Brand Voice' : 'Analyse Brand Voice'}
          </button>
        </div>
      </div>
    </div>
  );
}
