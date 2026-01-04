'use client';

import React from 'react';

interface PreviewPanelProps {
  children: React.ReactNode;
  type?: string;
}

export function PreviewPanel({ children, type }: PreviewPanelProps) {
  return (
    <div className="preview-panel" data-type={type}>
      {children}
    </div>
  );
}

interface HeaderProps {
  icon: string;
  title: string;
  status?: string;
}

export function Header({ icon, title, status }: HeaderProps) {
  return (
    <div className="preview-header">
      <div className="preview-icon">{icon}</div>
      <h2 className="preview-title">{title}</h2>
      {status && (
        <span className="preview-status">{status}</span>
      )}
    </div>
  );
}

interface InfoBoxProps {
  children: React.ReactNode;
  type?: 'info' | 'success' | 'warning';
}

export function InfoBox({ children, type = 'info' }: InfoBoxProps) {
  return (
    <div className={`info-box info-box-${type}`}>
      {children}
    </div>
  );
}

interface StepsSectionProps {
  children: React.ReactNode;
  title?: string;
}

export function StepsSection({ children, title }: StepsSectionProps) {
  return (
    <div className="steps-section">
      {title && <h3 className="step-title">{title}</h3>}
      {children}
    </div>
  );
}

interface StepProps {
  number: number | string;
  children: React.ReactNode;
}

export function Step({ number, children }: StepProps) {
  return (
    <div className="step">
      <span className="step-number">{number}</span>
      <div className="step-content">{children}</div>
    </div>
  );
}

interface CodeProps {
  children: React.ReactNode;
}

export function Code({ children }: CodeProps) {
  return <code className="inline-code">{children}</code>;
}

interface ActionsProps {
  children: React.ReactNode;
}

export function Actions({ children }: ActionsProps) {
  return <div className="preview-actions">{children}</div>;
}

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}

export function Button({ children, onClick, primary = false, disabled = false }: ButtonProps) {
  return (
    <button
      className={`preview-button ${primary ? 'preview-button-primary' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

interface LabelValueProps {
  label: string;
  value: string | string[];
  children?: React.ReactNode;
}

export function LabelValue({ label, value, children }: LabelValueProps) {
  return (
    <div className="label-value">
      <span className="label">{label}:</span>
      {Array.isArray(value) ? (
        <div className="value-list">
          {value.map((v, i) => (
            <span key={i} className="value-tag">{v}</span>
          ))}
        </div>
      ) : (
        <span className="value">{value}</span>
      )}
      {children}
    </div>
  );
}

interface TagListProps {
  children: React.ReactNode;
}

export function TagList({ children }: TagListProps) {
  return <div className="tag-list">{children}</div>;
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="tag">{children}</span>;
}

