'use client';

import { useState, useEffect, useRef } from 'react';

interface ConfigSchema {
  [key: string]: {
    type: 'text' | 'number' | 'select' | 'textarea' | 'json' | 'password' | 'checkbox' | 'number-list';
    label: string;
    default?: any;
    required?: boolean;
    options?: string[];
    description?: string;
    placeholder?: string;
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

  // Convert an array of numbers to a display string: [0, 3, 7] → "0, 3, 7"
  const numberListToDisplay = (val: unknown, defaultVal: unknown): string => {
    const arr = Array.isArray(val) ? val : Array.isArray(defaultVal) ? defaultVal : [];
    return arr.join(', ');
  };

  // Parse a comma-separated string to an array of numbers: "0, 3, 7" → [0, 3, 7]
  const parseNumberList = (raw: string): number[] =>
    raw.split(',').map(s => s.trim()).filter(s => s !== '').map(Number).filter(n => !isNaN(n));

  // Show JSON as pretty-printed; if value is already a string (e.g. from DB), parse then stringify
  const formatJsonForDisplay = (val: unknown): string => {
    if (val === undefined || val === null) return '[]';
    if (typeof val === 'string') {
      try {
        return JSON.stringify(JSON.parse(val), null, 2);
      } catch {
        return val;
      }
    }
    return JSON.stringify(val, null, 2);
  };

  const inputClass = 'w-full px-4 py-3 bg-white border border-[#e1e3e5] rounded-lg text-[#202223] placeholder:text-[#8c9196] focus:outline-none focus:border-[#2563eb] transition-colors';

  return (
    <div className="space-y-4">
      {Object.entries(configSchema).map(([key, schema]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-[#202223] mb-1.5">
            {schema.label}
            {schema.required && <span className="text-red-400 ml-1">*</span>}
          </label>

          {schema.description && (
            <p className="text-xs text-[#6d7175] mb-2">{schema.description}</p>
          )}

          {(schema.type === 'text' || schema.type === 'password') && (
            <input
              type={schema.type === 'password' ? 'password' : 'text'}
              value={config[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              required={schema.required}
              className={inputClass}
              placeholder={schema.placeholder ?? (schema.type === 'password' ? 'Paste your access token' : String(schema.default ?? ''))}
              autoComplete={schema.type === 'password' ? 'off' : undefined}
            />
          )}

          {schema.type === 'number' && (
            <input
              type="number"
              value={config[key] ?? ''}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              required={schema.required}
              className={inputClass}
              placeholder={schema.placeholder ?? String(schema.default ?? '')}
            />
          )}

          {schema.type === 'number-list' && (
            <input
              type="text"
              value={numberListToDisplay(config[key], schema.default)}
              onChange={(e) => handleChange(key, parseNumberList(e.target.value))}
              required={schema.required}
              className={inputClass}
              placeholder={schema.placeholder ?? (Array.isArray(schema.default) ? schema.default.join(', ') : '')}
            />
          )}

          {schema.type === 'select' && (
            <select
              value={config[key] || schema.default || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              required={schema.required}
              className={inputClass}
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
              className={inputClass}
              placeholder={schema.placeholder ?? String(schema.default ?? '')}
            />
          )}

          {schema.type === 'json' && (
            <>
              <textarea
                value={formatJsonForDisplay(config[key] ?? schema.default ?? [])}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleChange(key, parsed);
                  } catch {
                    // Invalid JSON — ignore until valid
                  }
                }}
                required={schema.required}
                rows={5}
                className={`${inputClass} font-mono text-sm`}
                placeholder={schema.placeholder}
                spellCheck={false}
              />
              <p className="text-xs text-[#8c9196] mt-1">Enter valid JSON</p>
            </>
          )}

          {schema.type === 'checkbox' && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config[key] ?? schema.default ?? false)}
                onChange={(e) => handleChange(key, e.target.checked)}
                className="w-4 h-4 rounded border-[#e1e3e5] bg-white text-[#2563eb] focus:ring-[#2563eb]"
              />
              <span className="text-[#202223] text-sm">Yes</span>
            </label>
          )}
        </div>
      ))}
    </div>
  );
}
