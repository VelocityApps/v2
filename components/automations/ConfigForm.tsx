'use client';

import { useState, useEffect, useRef } from 'react';

interface ConfigSchema {
  [key: string]: {
    type: 'text' | 'number' | 'select' | 'textarea' | 'json' | 'password';
    label: string;
    default?: any;
    required?: boolean;
    options?: string[];
  };
}

interface ConfigFormProps {
  configSchema: ConfigSchema;
  initialConfig?: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export default function ConfigForm({ configSchema, initialConfig, onChange }: ConfigFormProps) {
  const [config, setConfig] = useState<Record<string, any>>(() => {
    const defaultConfig: Record<string, any> = {};
    const schema = configSchema || {};
    Object.entries(schema).forEach(([key, s]) => {
      if (s.default !== undefined) defaultConfig[key] = s.default;
    });
    return { ...defaultConfig, ...(initialConfig || {}) };
  });

  const lastInitialRef = useRef<string>('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync from props only when schema or initialConfig *value* changes (not reference)
  const initialConfigKey = typeof initialConfig === 'object' && initialConfig !== null
    ? JSON.stringify(initialConfig)
    : '';
  useEffect(() => {
    const defaultConfig: Record<string, any> = {};
    Object.entries(configSchema || {}).forEach(([key, schema]) => {
      if (schema.default !== undefined) defaultConfig[key] = schema.default;
    });
    const merged = { ...defaultConfig, ...(initialConfig || {}) };
    const key = JSON.stringify(merged);
    if (key === lastInitialRef.current) return;
    lastInitialRef.current = key;
    setConfig(merged);
  }, [configSchema, initialConfigKey]);

  // Notify parent when config changes; use ref for onChange so we don't retrigger on parent re-render
  useEffect(() => {
    onChangeRef.current(config);
  }, [config]);

  const handleChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {Object.entries(configSchema).map(([key, schema]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {schema.label}
            {schema.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          
          {(schema.type === 'text' || schema.type === 'password') && (
            <input
              type={schema.type === 'password' ? 'password' : 'text'}
              value={config[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              required={schema.required}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#0066cc] transition-colors"
              placeholder={schema.type === 'password' ? 'Paste token from developers.pinterest.com' : schema.default}
              autoComplete={schema.type === 'password' ? 'off' : undefined}
            />
          )}

          {schema.type === 'number' && (
            <input
              type="number"
              value={config[key] || ''}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              required={schema.required}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#0066cc] transition-colors"
              placeholder={schema.default}
            />
          )}

          {schema.type === 'select' && (
            <select
              value={config[key] || schema.default || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              required={schema.required}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white focus:outline-none focus:border-[#0066cc] transition-colors"
            >
              {schema.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {schema.type === 'textarea' && (
            <textarea
              value={config[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              required={schema.required}
              rows={4}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#0066cc] transition-colors"
              placeholder={schema.default}
            />
          )}

          {schema.type === 'json' && (
            <textarea
              value={JSON.stringify(config[key] || schema.default || [], null, 2)}
              onChange={(e) => {
                try {
                  handleChange(key, JSON.parse(e.target.value));
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              required={schema.required}
              rows={4}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#0066cc] transition-colors"
            />
          )}
        </div>
      ))}
    </div>
  );
}



