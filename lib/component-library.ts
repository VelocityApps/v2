/**
 * Component Library
 * Pre-built UI components users can drag-drop (buttons, forms, cards)
 */

export interface Component {
  id: string;
  name: string;
  category: 'button' | 'form' | 'card' | 'input' | 'layout' | 'navigation' | 'feedback';
  description: string;
  code: string;
  preview?: string;
  props?: ComponentProp[];
  tags: string[];
}

export interface ComponentProp {
  name: string;
  type: string;
  default?: any;
  required?: boolean;
  description?: string;
}

export const COMPONENT_LIBRARY: Component[] = [
  // Buttons
  {
    id: 'btn-primary',
    name: 'Primary Button',
    category: 'button',
    description: 'A primary action button with gradient',
    code: `function PrimaryButton({ children, onClick, disabled = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`px-6 py-3 bg-gradient-to-r from-[#0066cc] to-[#3498db] hover:from-[#2980b9] hover:to-[#5dade2] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl \${className}\`}
    >
      {children}
    </button>
  );
}`,
    props: [
      { name: 'children', type: 'ReactNode', required: true },
      { name: 'onClick', type: 'function' },
      { name: 'disabled', type: 'boolean', default: false },
      { name: 'className', type: 'string', default: '' },
    ],
    tags: ['button', 'primary', 'gradient'],
  },
  {
    id: 'btn-secondary',
    name: 'Secondary Button',
    category: 'button',
    description: 'A secondary button with outline style',
    code: `function SecondaryButton({ children, onClick, disabled = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`px-6 py-3 border-2 border-[#0066cc] text-[#0066cc] font-semibold rounded-lg hover:bg-[#0066cc] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed \${className}\`}
    >
      {children}
    </button>
  );
}`,
    tags: ['button', 'secondary', 'outline'],
  },
  {
    id: 'btn-icon',
    name: 'Icon Button',
    category: 'button',
    description: 'A button with an icon',
    code: `function IconButton({ icon, onClick, disabled = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed \${className}\`}
    >
      {icon}
    </button>
  );
}`,
    props: [
      { name: 'icon', type: 'ReactNode', required: true },
      { name: 'onClick', type: 'function' },
      { name: 'disabled', type: 'boolean', default: false },
    ],
    tags: ['button', 'icon'],
  },
  
  // Forms
  {
    id: 'input-text',
    name: 'Text Input',
    category: 'form',
    description: 'A styled text input field',
    code: `function TextInput({ label, value, onChange, placeholder = '', type = 'text', required = false, className = '' }) {
  return (
    <div className={\`flex flex-col gap-2 \${className}\`}>
      {label && <label className="text-sm font-medium text-gray-300">{label}{required && <span className="text-red-400">*</span>}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc] transition-colors"
      />
    </div>
  );
}`,
    props: [
      { name: 'label', type: 'string' },
      { name: 'value', type: 'string', required: true },
      { name: 'onChange', type: 'function', required: true },
      { name: 'placeholder', type: 'string', default: '' },
      { name: 'type', type: 'string', default: 'text' },
      { name: 'required', type: 'boolean', default: false },
    ],
    tags: ['form', 'input', 'text'],
  },
  {
    id: 'input-textarea',
    name: 'Textarea',
    category: 'form',
    description: 'A multi-line text input',
    code: `function Textarea({ label, value, onChange, placeholder = '', rows = 4, required = false, className = '' }) {
  return (
    <div className={\`flex flex-col gap-2 \${className}\`}>
      {label && <label className="text-sm font-medium text-gray-300">{label}{required && <span className="text-red-400">*</span>}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#0066cc] transition-colors resize-none"
      />
    </div>
  );
}`,
    tags: ['form', 'textarea'],
  },
  {
    id: 'input-select',
    name: 'Select Dropdown',
    category: 'form',
    description: 'A styled select dropdown',
    code: `function Select({ label, value, onChange, options = [], required = false, className = '' }) {
  return (
    <div className={\`flex flex-col gap-2 \${className}\`}>
      {label && <label className="text-sm font-medium text-gray-300">{label}{required && <span className="text-red-400">*</span>}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white focus:outline-none focus:border-[#0066cc] transition-colors"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}`,
    props: [
      { name: 'options', type: 'array', default: '[]' },
    ],
    tags: ['form', 'select', 'dropdown'],
  },
  
  // Cards
  {
    id: 'card-basic',
    name: 'Basic Card',
    category: 'card',
    description: 'A simple card container',
    code: `function Card({ children, title, className = '' }) {
  return (
    <div className={\`bg-[#1a1a1a] border border-[#333] rounded-xl p-6 \${className}\`}>
      {title && <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>}
      {children}
    </div>
  );
}`,
    tags: ['card', 'container'],
  },
  {
    id: 'card-feature',
    name: 'Feature Card',
    category: 'card',
    description: 'A card with icon, title, and description',
    code: `function FeatureCard({ icon, title, description, className = '' }) {
  return (
    <div className={\`bg-[#1a1a1a] border border-[#333] rounded-xl p-6 hover:border-[#0066cc] transition-colors \${className}\`}>
      {icon && <div className="text-4xl mb-4">{icon}</div>}
      {title && <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>}
      {description && <p className="text-gray-400">{description}</p>}
    </div>
  );
}`,
    tags: ['card', 'feature'],
  },
  
  // Layout
  {
    id: 'container',
    name: 'Container',
    category: 'layout',
    description: 'A centered container with max width',
    code: `function Container({ children, className = '' }) {
  return (
    <div className={\`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 \${className}\`}>
      {children}
    </div>
  );
}`,
    tags: ['layout', 'container'],
  },
  {
    id: 'grid',
    name: 'Grid Layout',
    category: 'layout',
    description: 'A responsive grid layout',
    code: `function Grid({ children, cols = 3, gap = 6, className = '' }) {
  return (
    <div className={\`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-\${cols} gap-\${gap} \${className}\`}>
      {children}
    </div>
  );
}`,
    tags: ['layout', 'grid'],
  },
];

/**
 * Get components by category
 */
export function getComponentsByCategory(category: Component['category']): Component[] {
  return COMPONENT_LIBRARY.filter((c) => c.category === category);
}

/**
 * Search components by query
 */
export function searchComponents(query: string): Component[] {
  const lowerQuery = query.toLowerCase();
  return COMPONENT_LIBRARY.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      c.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get component by ID
 */
export function getComponentById(id: string): Component | undefined {
  return COMPONENT_LIBRARY.find((c) => c.id === id);
}

