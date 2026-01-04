'use client';

import React from 'react';
import { PreviewPanel, Header, InfoBox, StepsSection, Step, Code, Actions, Button, LabelValue, TagList, Tag } from './PreviewPanel';
import { extractTableNames, extractSQLFeatures } from '@/lib/code-analysis';
import { copyToClipboard, downloadFile, openLink } from '@/lib/preview-actions';

interface SQLPreviewProps {
  code: string;
  subtype: 'SUPABASE' | 'SQL';
}

export default function SQLPreview({ code, subtype }: SQLPreviewProps) {
  const tables = extractTableNames(code);
  const features = extractSQLFeatures(code);
  const isSupabase = subtype === 'SUPABASE';

  const handleCopy = () => {
    copyToClipboard(code);
  };

  const handleDownload = () => {
    downloadFile(code, 'schema.sql');
  };

  const handleOpenSupabase = () => {
    openLink('https://supabase.com/dashboard');
  };

  return (
    <PreviewPanel type="sql">
      <Header 
        icon="⚡" 
        title={isSupabase ? "Supabase SQL Schema Generated" : "SQL Schema Generated"}
      />
      
      <InfoBox type="success">
        Your {isSupabase ? 'Supabase' : 'database'} schema is ready to deploy.
      </InfoBox>
      
      {isSupabase ? (
        <StepsSection title="Deploy to Supabase:">
          <Step number="1">
            Copy the SQL code below
          </Step>
          <Step number="2">
            Go to <button onClick={handleOpenSupabase} className="link-button">Supabase Dashboard</button> → SQL Editor
          </Step>
          <Step number="3">
            Paste and click "Run"
          </Step>
        </StepsSection>
      ) : (
        <StepsSection title="Deploy to Database:">
          <Step number="1">
            Connect to your database (PostgreSQL, MySQL, etc.)
          </Step>
          <Step number="2">
            Copy the SQL code below
          </Step>
          <Step number="3">
            Run the SQL in your database client
          </Step>
        </StepsSection>
      )}
      
      <div className="detected-info">
        {tables.length > 0 && (
          <LabelValue 
            label="Tables Created" 
            value={tables}
          />
        )}
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
      
      <div className="code-preview">
        <pre className="code-block">
          <code>{code.substring(0, 500)}{code.length > 500 ? '...' : ''}</code>
        </pre>
      </div>
      
      <Actions>
        <Button primary onClick={handleCopy}>
          📋 Copy SQL
        </Button>
        <Button onClick={handleDownload}>
          💾 Download .sql
        </Button>
        {isSupabase && (
          <Button onClick={handleOpenSupabase}>
            🚀 Open Supabase Dashboard
          </Button>
        )}
      </Actions>
    </PreviewPanel>
  );
}

