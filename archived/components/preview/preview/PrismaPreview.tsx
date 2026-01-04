'use client';

import React from 'react';
import { PreviewPanel, Header, InfoBox, StepsSection, Step, Code, Actions, Button, LabelValue } from './PreviewPanel';
import { extractPrismaModels, extractPrismaDatabaseType } from '@/lib/code-analysis';
import { copyToClipboard, downloadFile } from '@/lib/preview-actions';

interface PrismaPreviewProps {
  code: string;
}

export default function PrismaPreview({ code }: PrismaPreviewProps) {
  const models = extractPrismaModels(code);
  const databaseType = extractPrismaDatabaseType(code);

  const handleCopy = () => {
    copyToClipboard(code);
  };

  const handleDownload = () => {
    downloadFile(code, 'schema.prisma');
  };

  const handleOpenDocs = () => {
    window.open('https://www.prisma.io/docs', '_blank', 'noopener,noreferrer');
  };

  return (
    <PreviewPanel type="prisma">
      <Header 
        icon="🗄️" 
        title="Prisma Database Schema Generated"
        status="✓ Ready to use"
      />
      
      <InfoBox type="success">
        Your database schema has been generated with Prisma ORM.
      </InfoBox>
      
      <StepsSection title="Next Steps:">
        <Step number="1">
          Save <Code>schema.prisma</Code> to your project root
        </Step>
        <Step number="2">
          Install Prisma: <Code>npm install prisma @prisma/client</Code>
        </Step>
        <Step number="3">
          Generate client: <Code>npx prisma generate</Code>
        </Step>
        <Step number="4">
          Apply schema: <Code>npx prisma migrate dev --name init</Code>
        </Step>
      </StepsSection>
      
      <div className="detected-info">
        {models.length > 0 && (
          <LabelValue 
            label="Detected Models" 
            value={models}
          />
        )}
        <LabelValue 
          label="Database" 
          value={databaseType}
        />
      </div>
      
      <Actions>
        <Button primary onClick={handleCopy}>
          📋 Copy Schema
        </Button>
        <Button onClick={handleDownload}>
          💾 Download schema.prisma
        </Button>
        <Button onClick={handleOpenDocs}>
          📖 Prisma Docs
        </Button>
      </Actions>
    </PreviewPanel>
  );
}

