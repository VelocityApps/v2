'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface CsvRow {
  product_title: string;
  bullet_points: string;
  tone: string;
  language: string;
}

interface ProcessedRow extends CsvRow {
  generated_description: string;
  error?: string;
}

const VALID_TONES = ['casual', 'premium', 'technical', 'playful'];

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    // Simple CSV parse — handles quoted fields
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row: any = {};
    header.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

    rows.push({
      product_title: row.product_title ?? '',
      bullet_points: row.bullet_points ?? '',
      tone: VALID_TONES.includes(row.tone) ? row.tone : 'premium',
      language: row.language || 'en',
    });
  }

  return rows.filter((r) => r.product_title.trim());
}

function toCsv(rows: ProcessedRow[]): string {
  const header = 'product_title,bullet_points,tone,language,generated_description';
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      escape(r.product_title),
      escape(r.bullet_points),
      escape(r.tone),
      escape(r.language),
      escape(r.generated_description ?? r.error ?? ''),
    ].join(',')
  );
  return [header, ...lines].join('\n');
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function BulkDescriptionPage() {
  const { session } = useAuth();
  const router = useRouter();

  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<CsvRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file.');
      return;
    }
    setFileName(file.name);
    setDone(false);
    setResults([]);
    setProgress(0);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast.error('No valid rows found. Check your CSV has the required columns.');
        return;
      }
      setParsed(rows);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  async function handleProcess() {
    if (!session || !parsed || processing) return;
    setProcessing(true);
    cancelRef.current = false;
    setDone(false);
    setResults([]);

    const processedRows: ProcessedRow[] = [];

    for (let i = 0; i < parsed.length; i++) {
      if (cancelRef.current) break;

      const row = parsed[i];
      const bullets = row.bullet_points.split('|').map((b) => b.trim()).filter(Boolean);

      let generated = '';
      let error: string | undefined;

      try {
        const res = await fetch('/api/generate-description', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productTitle: row.product_title,
            bulletPoints: bullets.length > 0 ? bullets : ['See product details'],
            tone: row.tone,
            language: row.language,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          error = data.error ?? 'Generation failed';
        } else {
          generated = data.output ?? '';
        }
      } catch (err: any) {
        error = err.message ?? 'Network error';
      }

      processedRows.push({
        ...row,
        generated_description: generated,
        ...(error ? { error } : {}),
      });

      setResults([...processedRows]);
      setProgress(Math.round(((i + 1) / parsed.length) * 100));

      // 500ms delay between calls to respect rate limits
      if (i < parsed.length - 1) await sleep(500);
    }

    setProcessing(false);
    setDone(true);
    if (!cancelRef.current) {
      toast.success(`Done! Generated ${processedRows.filter((r) => r.generated_description).length} descriptions.`);
    }
  }

  function handleCancel() {
    cancelRef.current = true;
  }

  function handleDownload() {
    const csv = toCsv(results);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `descriptions_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard/description-writer"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Bulk Description Generator</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Upload a CSV to generate descriptions for your entire product catalogue
            </p>
          </div>
        </div>

        {/* CSV format guide */}
        <div className="mb-6 p-4 bg-[var(--accent-bg)] border border-[var(--accent-border)] rounded-xl text-sm">
          <p className="font-medium text-[var(--accent-text)] mb-1">Required CSV format</p>
          <code className="text-xs text-[var(--text-secondary)] font-mono block">
            product_title,bullet_points,tone,language
          </code>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Bullet points are pipe-separated:{' '}
            <code className="font-mono">Fast charging|Eco-friendly|5-year warranty</code>
            {' '}· Tone: casual / premium / technical / playful
          </p>
        </div>

        {/* Drop zone */}
        {!parsed && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
              dragging
                ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                : 'border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-primary)]'
            }`}
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="font-medium text-[var(--text-primary)] mb-1">
              Drop your CSV here or click to browse
            </p>
            <p className="text-sm text-[var(--text-secondary)]">.csv files only</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        )}

        {/* Preview table */}
        {parsed && !processing && !done && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-[var(--text-primary)]">{fileName}</p>
                <p className="text-sm text-[var(--text-secondary)]">{parsed.length} products ready to process</p>
              </div>
              <button
                onClick={() => { setParsed(null); setFileName(''); }}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors"
              >
                Remove
              </button>
            </div>

            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden mb-6">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                      {['Product Title', 'Bullet Points', 'Tone', 'Language'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-4 py-2.5 text-[var(--text-primary)] max-w-[180px] truncate">{row.product_title}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)] max-w-[200px] truncate">{row.bullet_points}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)] capitalize">{row.tone}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)] uppercase text-xs">{row.language}</td>
                      </tr>
                    ))}
                    {parsed.length > 20 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-xs text-[var(--text-muted)] text-center">
                          + {parsed.length - 20} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={handleProcess}
              className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors"
            >
              Generate {parsed.length} Descriptions
            </button>
          </div>
        )}

        {/* Processing state with progress */}
        {(processing || (done && results.length > 0)) && (
          <div>
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {processing
                    ? `Generating… ${results.length} / ${parsed?.length ?? 0}`
                    : `Done — ${results.filter((r) => r.generated_description).length} generated`}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">{progress}%</span>
              </div>
              <div className="w-full bg-[var(--border)] rounded-full h-2">
                <div
                  className="bg-[var(--accent)] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {processing && (
                <button
                  onClick={handleCancel}
                  className="mt-2 text-xs text-[var(--error)] hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Results table */}
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl overflow-hidden mb-6">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                      {['Product Title', 'Tone', 'Status', 'Preview'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-4 py-2.5 text-[var(--text-primary)] max-w-[160px] truncate">{row.product_title}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)] capitalize text-xs">{row.tone}</td>
                        <td className="px-4 py-2.5">
                          {row.error ? (
                            <span className="text-xs text-[var(--error)]">Failed</span>
                          ) : (
                            <span className="text-xs text-[var(--success)]">✓ Done</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)] max-w-[260px] truncate text-xs">
                          {row.error || row.generated_description.replace(/<[^>]+>/g, ' ').trim().slice(0, 80)}
                        </td>
                      </tr>
                    ))}
                    {processing && results.length < (parsed?.length ?? 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-3">
                          <div className="h-4 bg-[var(--bg-secondary)] rounded animate-pulse" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {done && (
              <button
                onClick={handleDownload}
                className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition-colors"
              >
                Download Results CSV
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
