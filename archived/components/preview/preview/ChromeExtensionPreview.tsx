'use client';

import React from 'react';
import { PreviewPanel, Header, StepsSection, Step, Code, Actions, Button, LabelValue } from './PreviewPanel';
import { extractManifestVersion, extractChromePermissions } from '@/lib/code-analysis';
import { downloadZip } from '@/lib/preview-actions';

interface ChromeExtensionPreviewProps {
  code: string;
  files?: Array<{ path: string; content: string }>;
}

export default function ChromeExtensionPreview({ code, files }: ChromeExtensionPreviewProps) {
  const manifestVersion = extractManifestVersion(code);
  const permissions = extractChromePermissions(code);

  const handleDownload = () => {
    if (files && files.length > 0) {
      downloadZip(files, 'chrome-extension');
    } else {
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chrome-extension.zip';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleViewManifest = () => {
    // Find manifest.json in files or code
    const manifestContent = files?.find(f => f.path.includes('manifest.json'))?.content || code;
    const blob = new Blob([manifestContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleChromeStoreGuide = () => {
    window.open('https://developer.chrome.com/docs/webstore/publish', '_blank', 'noopener,noreferrer');
  };

  return (
    <PreviewPanel type="chrome-extension">
      <Header 
        icon="🧩" 
        title="Chrome Extension Generated"
      />
      
      <StepsSection title="Load in Chrome:">
        <Step number="1">
          Open <Code>chrome://extensions</Code> in Chrome
        </Step>
        <Step number="2">
          Enable "Developer mode" (top right toggle)
        </Step>
        <Step number="3">
          Click "Load unpacked"
        </Step>
        <Step number="4">
          Select the downloaded folder
        </Step>
        <Step number="5">
          Extension appears in Chrome toolbar!
        </Step>
      </StepsSection>
      
      <div className="extension-info">
        <LabelValue label="Manifest Version" value={manifestVersion} />
        {permissions.length > 0 && (
          <LabelValue label="Permissions" value={permissions} />
        )}
      </div>
      
      <Actions>
        <Button primary onClick={handleDownload}>
          📦 Download Extension
        </Button>
        <Button onClick={handleViewManifest}>
          📄 View Manifest
        </Button>
        <Button onClick={handleChromeStoreGuide}>
          🏪 Publish to Chrome Web Store
        </Button>
      </Actions>
    </PreviewPanel>
  );
}

