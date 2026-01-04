'use client';

import React from 'react';
import { PreviewPanel, Header, InfoBox, StepsSection, Step, Code, Actions, Button, LabelValue, TagList, Tag } from './PreviewPanel';
import { extractShopifyFeatures, detectShopifyAppType } from '@/lib/code-analysis';
import { downloadZip } from '@/lib/preview-actions';

interface ShopifyAppPreviewProps {
  code: string;
  files?: Array<{ path: string; content: string }>;
}

export default function ShopifyAppPreview({ code, files }: ShopifyAppPreviewProps) {
  const appType = detectShopifyAppType(code);
  const features = extractShopifyFeatures(code);

  const handleDeploy = () => {
    // This will be wired up to the Shopify deployment modal
    window.dispatchEvent(new CustomEvent('open-shopify-deploy'));
  };

  const handleDownload = () => {
    if (files && files.length > 0) {
      downloadZip(files, 'shopify-app');
    } else {
      // Fallback: download single file
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shopify-app.zip';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleViewGuide = () => {
    window.open('https://shopify.dev/docs/apps', '_blank', 'noopener,noreferrer');
  };

  return (
    <PreviewPanel type="shopify">
      <Header 
        icon="🛍️" 
        title="Shopify App Generated"
      />
      
      <InfoBox type="success">
        Your Shopify app is ready to deploy!
      </InfoBox>
      
      <div className="app-info">
        <LabelValue label="App Type" value={appType} />
        <LabelValue label="Framework" value="Remix + Shopify Polaris" />
        {features.length > 0 && (
          <div className="label-value">
            <span className="label">Features:</span>
            <TagList>
              {features.map((feature, i) => (
                <Tag key={i}>{feature}</Tag>
              ))}
            </TagList>
          </div>
        )}
      </div>
      
      <StepsSection title="Test Locally:">
        <Step number="1">
          Install dependencies: <Code>npm install</Code>
        </Step>
        <Step number="2">
          Configure Shopify credentials in <Code>.env</Code>
        </Step>
        <Step number="3">
          Start dev server: <Code>npm run dev</Code>
        </Step>
      </StepsSection>
      
      <Actions>
        <Button primary onClick={handleDeploy}>
          🚀 Deploy to Shopify
        </Button>
        <Button onClick={handleDownload}>
          📦 Download Code
        </Button>
        <Button onClick={handleViewGuide}>
          📖 Setup Guide
        </Button>
      </Actions>
    </PreviewPanel>
  );
}

