'use client';

import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';

interface ShareCardGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  projectName?: string;
  generationTime?: number;
  generationMode?: string;
  modelUsed?: string;
  subscriptionStatus: 'free' | 'pro' | 'teams' | 'cancelled';
}

type CardFormat = 'story' | 'square' | 'wide';

const FORMATS: { id: CardFormat; name: string; ratio: string; dimensions: string; width: number; height: number }[] = [
  { id: 'story', name: '9:16 Story', ratio: '9:16', dimensions: '1080x1920', width: 1080, height: 1920 },
  { id: 'square', name: '1:1 Post', ratio: '1:1', dimensions: '1080x1080', width: 1080, height: 1080 },
  { id: 'wide', name: '16:9 Wide', ratio: '16:9', dimensions: '1200x630', width: 1200, height: 630 },
];

export default function ShareCardGenerator({
  isOpen,
  onClose,
  code,
  projectName,
  generationTime,
  generationMode,
  modelUsed,
  subscriptionStatus,
}: ShareCardGeneratorProps) {
  const [selectedFormat, setSelectedFormat] = useState<CardFormat>('square');
  const [generating, setGenerating] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const format = FORMATS.find(f => f.id === selectedFormat)!;

  const generateCard = async () => {
    if (!cardRef.current) return;

    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        width: format.width,
        height: format.height,
        scale: 2, // Retina quality
        backgroundColor: null,
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      setCardDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating card:', error);
    } finally {
      setGenerating(false);
    }
  };

  const downloadCard = () => {
    if (!cardDataUrl) return;
    const link = document.createElement('a');
    link.download = `velocityapps-share-${selectedFormat}-${Date.now()}.png`;
    link.href = cardDataUrl;
    link.click();
  };

  const copyCard = async () => {
    if (!cardDataUrl) return;
    try {
      const response = await fetch(cardDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert('Card copied to clipboard!');
    } catch (error) {
      console.error('Error copying card:', error);
      alert('Failed to copy. Try downloading instead.');
    }
  };

  if (!isOpen) return null;

  // Extract first few lines of code for preview
  const codePreview = code.split('\n').slice(0, 12).join('\n');
  const techStack = ['React', 'Tailwind', 'TypeScript'].filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Generate Share Card</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Format Selection */}
          {!cardDataUrl && (
            <div className="mb-6">
              <h3 className="text-white font-medium mb-4">Choose Share Format</h3>
              <div className="grid grid-cols-3 gap-4">
                {FORMATS.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`
                      p-4 rounded-xl border-2 transition-all
                      ${selectedFormat === fmt.id
                        ? 'border-[#0066cc] bg-[#0066cc]/10'
                        : 'border-gray-700 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="text-white font-medium mb-1">{fmt.name}</div>
                    <div className="text-gray-400 text-sm mb-2">{fmt.ratio}</div>
                    <div className="text-gray-500 text-xs">{fmt.dimensions}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card Preview */}
          <div className="mb-6">
            <div
              ref={cardRef}
              className="relative mx-auto"
              style={{
                width: format.width,
                height: format.height,
                maxWidth: '100%',
                maxHeight: '60vh',
              }}
            >
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0a2463] via-[#0066cc] to-[#3498db]">
                {/* Noise texture overlay */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }} />
                
                {/* Logo watermark (background) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5">
                  <svg className="w-full h-full" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Stylized V with three parallel lines on left */}
                    <g>
                      {/* Left arm of V - three parallel vertical lines (striped) */}
                      <line x1="8" y1="5" x2="8" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      <line x1="12" y1="5" x2="12" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      <line x1="16" y1="5" x2="16" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      
                      {/* Right arm of V integrated with upward arrow */}
                      <path d="M20 40 L32 8" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
                      <polygon points="32,8 28,12 36,10" fill="white"/>
                      
                      {/* Speed lines */}
                      <line x1="28" y1="20" x2="38" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
                      <line x1="30" y1="25" x2="36" y2="25" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                      <line x1="32" y1="30" x2="35" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
                    </g>
                    <text x="50" y="38" fontFamily="system-ui" fontSize="24" fontWeight="600" fill="white">
                      <tspan>Velocity</tspan><tspan>Apps</tspan>
                    </text>
                  </svg>
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col p-8">
                  {/* Logo in corner */}
                  <div className="absolute top-6 left-6">
                    <svg className="w-20 h-6" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Stylized V with three parallel lines on left */}
                      <g>
                        {/* Left arm of V - three parallel vertical lines (striped) */}
                        <line x1="8" y1="5" x2="8" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                        <line x1="12" y1="5" x2="12" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                        <line x1="16" y1="5" x2="16" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                        
                        {/* Right arm of V integrated with upward arrow */}
                        <path d="M20 40 L32 8" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
                        <polygon points="32,8 28,12 36,10" fill="white"/>
                        
                        {/* Speed lines */}
                        <line x1="28" y1="20" x2="38" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
                        <line x1="30" y1="25" x2="36" y2="25" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                        <line x1="32" y1="30" x2="35" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
                      </g>
                      <text x="50" y="38" fontFamily="system-ui" fontSize="24" fontWeight="600" fill="white">
                        <tspan>Velocity</tspan><tspan fill="#3498db">Apps</tspan>
                      </text>
                    </svg>
                  </div>

                  {/* Code Preview (top section) */}
                  <div className="flex-1 flex items-center justify-center mt-16">
                    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 max-w-2xl w-full border border-white/10">
                      <pre className="text-white text-sm font-mono overflow-hidden" style={{ filter: 'blur(2px)' }}>
                        {codePreview}
                      </pre>
                    </div>
                  </div>

                  {/* Stats Overlay (bottom) */}
                  <div className="mt-auto bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-white text-2xl font-bold mb-1">
                          Built in {generationTime || 15} seconds
                        </div>
                        <div className="text-white/80 text-sm">
                          {generationMode === 'turbo' ? 'Quick Draft' : generationMode === 'forge' ? 'Standard' : 'Premium'} mode
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white/60 text-xs mb-1">Lines of code</div>
                        <div className="text-white text-xl font-bold">{code.split('\n').length}</div>
                      </div>
                    </div>
                    
                    {/* Tech stack badges */}
                    <div className="flex gap-2 mb-4">
                      {techStack.map((tech) => (
                        <span key={tech} className="px-3 py-1 bg-white/20 rounded-full text-white text-xs font-medium">
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="pt-4 border-t border-white/20">
                      <div className="text-white text-lg font-bold mb-1">Build yours at VelocityApps.dev</div>
                      <div className="text-white/70 text-sm">AI-Powered App Builder</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!cardDataUrl ? (
              <button
                onClick={generateCard}
                disabled={generating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#0066cc] to-[#3498db] hover:from-[#2980b9] hover:to-[#5dade2] text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Card'}
              </button>
            ) : (
              <>
                <button
                  onClick={downloadCard}
                  className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
                >
                  Download PNG
                </button>
                <button
                  onClick={copyCard}
                  className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => setCardDataUrl(null)}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
                >
                  Regenerate
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

