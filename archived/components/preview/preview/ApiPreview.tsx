'use client';

import React from 'react';
import { PreviewPanel, Header, InfoBox, StepsSection, Step, Code, Actions, Button, LabelValue } from './PreviewPanel';
import { extractApiEndpoints, detectApiFramework } from '@/lib/code-analysis';
import { downloadZip } from '@/lib/preview-actions';

interface ApiPreviewProps {
  code: string;
  framework?: string;
  files?: Array<{ path: string; content: string }>;
}

export default function ApiPreview({ code, framework, files }: ApiPreviewProps) {
  const detectedFramework = framework || detectApiFramework(code);
  const endpoints = extractApiEndpoints(code);

  const handleDeployRailway = () => {
    window.dispatchEvent(new CustomEvent('open-railway-deploy'));
  };

  const handleDeployVercel = () => {
    window.dispatchEvent(new CustomEvent('open-vercel-deploy'));
  };

  const handleDownload = () => {
    if (files && files.length > 0) {
      downloadZip(files, 'api-backend');
    } else {
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'api-backend.zip';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <PreviewPanel type="api">
      <Header 
        icon="⚡" 
        title="API Backend Generated"
      />
      
      <InfoBox type="success">
        Your API is ready to deploy!
      </InfoBox>
      
      <div className="api-info">
        <LabelValue label="Framework" value={detectedFramework} />
        {endpoints.length > 0 && (
          <div className="endpoint-list">
            <span className="label">Endpoints:</span>
            <div className="endpoints">
              {endpoints.slice(0, 10).map((endpoint, i) => (
                <div key={i} className="endpoint">
                  <span className={`method method-${endpoint.method.toLowerCase()}`}>
                    {endpoint.method}
                  </span>
                  <span className="path">{endpoint.path}</span>
                </div>
              ))}
              {endpoints.length > 10 && (
                <div className="endpoint-more">
                  +{endpoints.length - 10} more endpoints
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <StepsSection title="Test Locally:">
        <Step number="1">
          Install: <Code>npm install</Code>
        </Step>
        <Step number="2">
          Start server: <Code>npm run dev</Code>
        </Step>
        <Step number="3">
          API runs at <Code>http://localhost:3000</Code>
        </Step>
        {endpoints.length > 0 && (
          <Step number="4">
            Test with: <Code>curl http://localhost:3000{endpoints[0].path}</Code>
          </Step>
        )}
      </StepsSection>
      
      <Actions>
        <Button primary onClick={handleDeployRailway}>
          🚀 Deploy to Railway
        </Button>
        <Button onClick={handleDeployVercel}>
          ▲ Deploy to Vercel
        </Button>
        <Button onClick={handleDownload}>
          📦 Download
        </Button>
      </Actions>
    </PreviewPanel>
  );
}

