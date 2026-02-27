# VelocityApps Design System

## Brand Identity

### Brand Personality
- **Professional but approachable** (not corporate, not too casual)
- **Trustworthy** (reliability is our competitive advantage)
- **Efficient** (we save time, design should feel fast)
- **Smart** (AI-powered, but not intimidating)
- **Clear** (no jargon, plain English)

### Visual Tone
- Clean, modern, minimal
- Confident without being flashy
- Data-driven (show metrics, results)
- Action-oriented (CTAs are clear)

---

## Color Palette

### Primary Colors
```css
/* Main brand color - Teal (trust, efficiency) */
--primary-500: #00bcd4;      /* Main CTA buttons, links */
--primary-600: #00acc1;      /* Hover states */
--primary-700: #0097a7;      /* Active states */
--primary-50: #e0f7fa;       /* Light backgrounds */
--primary-100: #b2ebf2;      /* Very light backgrounds */

/* Secondary - Lime Green (energy, growth) */
--secondary-500: #32cd32;    /* Accents, success states */
--secondary-600: #2eb82e;    /* Hover states */
--secondary-700: #28a428;    /* Active states */

/* Gradient - Primary to Secondary */
--gradient-primary: linear-gradient(135deg, #00bcd4 0%, #32cd32 100%);
```

### Neutral Colors
```css
/* Text and backgrounds */
--gray-900: #0a0a0a;        /* Primary text, headers */
--gray-800: #1a1a1a;        /* Secondary text */
--gray-700: #2a2a2a;        /* Tertiary text, borders */
--gray-600: #3a3a3a;        /* Disabled text */
--gray-500: #4a4a4a;        /* Placeholder text */
--gray-400: #6a6a6a;        /* Subtle borders */
--gray-300: #8a8a8a;        /* Light borders */
--gray-200: #e0e0e0;        /* Very light borders */
--gray-100: #f5f5f5;        /* Light backgrounds */
--gray-50: #fafafa;         /* Very light backgrounds */

/* Background */
--bg-primary: #0a0a0a;      /* Main dark background */
--bg-secondary: #141414;    /* Secondary dark background */
--bg-tertiary: #1a1a1a;     /* Tertiary dark background */
--bg-card: #1a1a1a;         /* Card backgrounds */
--bg-card-hover: #222222;   /* Card hover states */
```

### Semantic Colors
```css
/* Success */
--success-500: #32cd32;     /* Success messages, badges */
--success-50: #f0fdf4;      /* Success backgrounds */

/* Warning */
--warning-500: #ff9500;     /* Warning messages, badges */
--warning-50: #fffbeb;      /* Warning backgrounds */

/* Error */
--error-500: #ef4444;       /* Error messages, badges */
--error-50: #fef2f2;        /* Error backgrounds */

/* Info */
--info-500: #00bcd4;        /* Info messages, badges */
--info-50: #e0f7fa;         /* Info backgrounds */
```

### Accent Colors (from logo)
```css
/* Orange V (energy, action) */
--accent-orange: #ff6600;

/* Teal V (trust, efficiency) */
--accent-teal: #40e0d0;

/* Used sparingly for highlights, icons, badges */
```

---

## Typography

### Font Families
```css
/* Primary font - Inter (clean, modern, highly legible) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace font - JetBrains Mono (for code, data, metrics) */
font-family: 'JetBrains Mono', 'Courier New', monospace;
```

### Font Sizes
```css
/* Display */
--text-6xl: 3.75rem;    /* 60px - Hero headlines */
--text-5xl: 3rem;       /* 48px - Large headlines */
--text-4xl: 2.25rem;    /* 36px - Section headlines */
--text-3xl: 1.875rem;   /* 30px - Page titles */
--text-2xl: 1.5rem;     /* 24px - Section titles */
--text-xl: 1.25rem;     /* 20px - Large body, card titles */
--text-lg: 1.125rem;    /* 18px - Body text, emphasis */
--text-base: 1rem;      /* 16px - Default body text */
--text-sm: 0.875rem;    /* 14px - Small text, captions */
--text-xs: 0.75rem;     /* 12px - Labels, metadata */
```

### Font Weights
```css
--font-light: 300;      /* Rare use - very light text */
--font-normal: 400;     /* Body text */
--font-medium: 500;     /* Emphasis, buttons */
--font-semibold: 600;   /* Headings, strong emphasis */
--font-bold: 700;       /* Strong headings */
--font-extrabold: 800;  /* Hero headlines */
```

### Line Heights
```css
--leading-tight: 1.25;   /* Headlines */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.75; /* Large body, readability */
```

---

## Spacing System

```css
/* 4px base unit (8-point grid system) */
--space-0: 0;
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
```

---

## Component Library

### Buttons

#### Primary Button
```tsx
// Large CTA button (hero sections, primary actions)
<button className="px-8 py-4 bg-gradient-to-r from-[#00bcd4] to-[#32cd32] hover:from-[#00acc1] hover:to-[#2eb82e] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#00bcd4]/30 hover:shadow-[#00bcd4]/50 hover:scale-105">
  Start Free Trial
</button>

// Medium button (forms, cards)
<button className="px-6 py-3 bg-gradient-to-r from-[#00bcd4] to-[#32cd32] hover:from-[#00acc1] hover:to-[#2eb82e] text-white font-medium rounded-lg transition-all">
  Activate Automation
</button>

// Small button (secondary actions)
<button className="px-4 py-2 bg-gradient-to-r from-[#00bcd4] to-[#32cd32] hover:from-[#00acc1] hover:to-[#2eb82e] text-white font-medium rounded-md transition-all text-sm">
  Save
</button>
```

#### Secondary Button
```tsx
<button className="px-6 py-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white font-medium rounded-lg transition-all">
  Learn More
</button>
```

#### Ghost Button
```tsx
<button className="px-6 py-3 text-[#00bcd4] hover:text-[#00acc1] font-medium rounded-lg transition-all hover:bg-[#00bcd4]/10">
  Cancel
</button>
```

### Cards

#### Automation Card (Marketplace)
```tsx
<div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#00bcd4]/50 transition-all hover:shadow-lg hover:shadow-[#00bcd4]/10">
  <div className="flex items-start justify-between mb-4">
    <div className="w-12 h-12 bg-gradient-to-br from-[#00bcd4] to-[#32cd32] rounded-lg flex items-center justify-center">
      {/* Icon */}
    </div>
    <span className="px-2 py-1 bg-[#00bcd4]/20 text-[#00bcd4] text-xs font-medium rounded">Popular</span>
  </div>
  <h3 className="text-xl font-semibold text-white mb-2">Review Request Automator</h3>
  <p className="text-gray-400 text-sm mb-4">Get 10x more reviews with AI-powered personalized requests</p>
  <div className="flex items-center justify-between">
    <span className="text-2xl font-bold text-white">£19<span className="text-sm font-normal text-gray-400">/mo</span></span>
    <button className="px-4 py-2 bg-[#00bcd4] hover:bg-[#00acc1] text-white font-medium rounded-lg transition-all text-sm">
      Activate
    </button>
  </div>
</div>
```

#### Metric Card (Dashboard)
```tsx
<div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm text-gray-400">Reviews Collected</span>
    <span className="text-xs text-[#32cd32] font-medium">+12%</span>
  </div>
  <div className="text-3xl font-bold text-white mb-1">1,247</div>
  <div className="text-xs text-gray-500">This month</div>
</div>
```

### Input Fields

#### Text Input
```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-300">Store Name</label>
  <input 
    type="text" 
    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00bcd4] focus:ring-2 focus:ring-[#00bcd4]/20 transition-all"
    placeholder="Enter your store name"
  />
</div>
```

#### Select Dropdown
```tsx
<select className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-[#00bcd4] focus:ring-2 focus:ring-[#00bcd4]/20 transition-all">
  <option>Select automation</option>
</select>
```

### Badges

```tsx
/* Status badges */
<span className="px-2 py-1 bg-[#32cd32]/20 text-[#32cd32] text-xs font-medium rounded">Active</span>
<span className="px-2 py-1 bg-[#ff9500]/20 text-[#ff9500] text-xs font-medium rounded">Pending</span>
<span className="px-2 py-1 bg-[#ef4444]/20 text-[#ef4444] text-xs font-medium rounded">Error</span>
<span className="px-2 py-1 bg-[#00bcd4]/20 text-[#00bcd4] text-xs font-medium rounded">Inactive</span>
```

### Alerts / Notifications

```tsx
/* Success alert */
<div className="p-4 bg-[#32cd32]/10 border border-[#32cd32]/30 rounded-lg flex items-start gap-3">
  <div className="w-5 h-5 text-[#32cd32]">✓</div>
  <div className="flex-1">
    <p className="text-sm font-medium text-[#32cd32]">Success!</p>
    <p className="text-sm text-gray-300 mt-1">Automation activated successfully</p>
  </div>
</div>

/* Error alert */
<div className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg flex items-start gap-3">
  <div className="w-5 h-5 text-[#ef4444]">✕</div>
  <div className="flex-1">
    <p className="text-sm font-medium text-[#ef4444]">Error</p>
    <p className="text-sm text-gray-300 mt-1">Failed to connect to Shopify store</p>
  </div>
</div>
```

### Navigation

#### Top Navigation
```tsx
<nav className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#2a2a2a]">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      {/* Logo, links, user menu */}
    </div>
  </div>
</nav>
```

### Tabs

```tsx
<div className="border-b border-[#2a2a2a] flex gap-4">
  <button className="px-4 py-2 border-b-2 border-[#00bcd4] text-[#00bcd4] font-medium text-sm">
    Active Automations
  </button>
  <button className="px-4 py-2 text-gray-400 hover:text-white font-medium text-sm transition-colors">
    Inactive
  </button>
</div>
```

---

## Layout Principles

### Container Widths
```css
/* Full width on mobile */
.container-sm { max-width: 640px; }   /* Small screens */
.container-md { max-width: 768px; }   /* Tablets */
.container-lg { max-width: 1024px; }  /* Laptops */
.container-xl { max-width: 1280px; }  /* Desktops */
.container-2xl { max-width: 1536px; } /* Large desktops */

/* Default: max-w-7xl (1280px) for most content */
```

### Grid System
```css
/* Use CSS Grid or Flexbox for layouts */
/* Common patterns: */
- 1 column (mobile)
- 2 columns (tablet)
- 3 columns (desktop)
- 4 columns (large desktop)
```

### Section Spacing
```css
/* Standard section spacing */
section { padding: 4rem 0; }        /* Small sections */
section { padding: 6rem 0; }        /* Medium sections */
section { padding: 8rem 0; }        /* Large sections (hero) */
```

---

## Animation & Transitions

### Transitions
```css
/* Standard transition */
transition-all duration-300 ease-in-out

/* Fast transitions (buttons, hover) */
transition-all duration-200 ease-in-out

/* Slow transitions (page transitions) */
transition-all duration-500 ease-in-out
```

### Hover Effects
```css
/* Scale on hover */
hover:scale-105

/* Shadow on hover */
hover:shadow-lg hover:shadow-[#00bcd4]/20

/* Border color on hover */
hover:border-[#00bcd4]/50
```

### Loading States
```css
/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 1s linear infinite; }

/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
```

---

## Accessibility

### Color Contrast
- **WCAG AA:** Minimum 4.5:1 for normal text, 3:1 for large text
- **WCAG AAA:** Minimum 7:1 for normal text, 4.5:1 for large text
- All text meets WCAG AA standards at minimum

### Focus States
- All interactive elements have visible focus indicators
- Focus ring: `focus:ring-2 focus:ring-[#00bcd4]/20`

### Screen Readers
- Semantic HTML used throughout
- ARIA labels where needed
- Alt text for all images
- Proper heading hierarchy (h1 → h2 → h3)

---

## Responsive Breakpoints

```css
/* Tailwind CSS breakpoints */
sm: 640px    /* Mobile landscape, small tablets */
md: 768px    /* Tablets */
lg: 1024px   /* Laptops */
xl: 1280px   /* Desktops */
2xl: 1536px  /* Large desktops */
```

### Mobile-First Approach
- Design for mobile first
- Progressively enhance for larger screens
- Touch targets minimum 44x44px
- Single column layouts on mobile

---

## Logo Usage

### Primary Logo
- **Full logo:** Logo icon + "VELOCITY APPS" text (horizontal)
- **Icon only:** Circular gradient logo (use when space is limited)
- **Minimum size:** 40px height for icon, 120px width for full logo
- **Clear space:** 1x logo height/width around logo

### Logo Variants
- **Dark backgrounds:** White text, full color gradient logo
- **Light backgrounds:** Dark text (if needed), full color gradient logo
- **Single color:** Gradient logo in single color if needed

---

## Icon System

### Icon Library
- **Primary:** Heroicons (outline and solid variants)
- **Secondary:** Custom icons for automations, metrics
- **Size:** 16px, 20px, 24px, 32px standard sizes
- **Color:** Inherit text color or use brand colors

### Usage
- Icons used for clarity, not decoration
- Consistent sizing within context
- Accessible (include text labels where appropriate)

---

## Content Guidelines

### Voice & Tone
- **Clear:** No jargon, plain English
- **Confident:** Not arrogant, but assured
- **Helpful:** Solve problems, not sell features
- **Conversational:** Like talking to a colleague, not a corporation

### Writing Style
- Short sentences (15-20 words average)
- Active voice (we do, not it is done)
- Specific numbers (10x more reviews, not "many reviews")
- Action-oriented CTAs ("Start Free Trial" not "Learn More")

### Headlines
- **H1:** Clear value proposition (benefit-focused)
- **H2:** Section summaries (what this section does)
- **H3:** Feature/benefit statements (specific outcomes)

---

## Usage Examples

### Marketing Page Hero
```tsx
<section className="bg-[#0a0a0a] text-white py-20">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center">
      <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-[#00bcd4] to-[#32cd32] bg-clip-text text-transparent">
        Shopify Automations That Just Work
      </h1>
      <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto">
        Stop wasting time on manual tasks. Browse 20+ pre-built automations for your Shopify store. 
        No code, no deployment, just works.
      </p>
      <button className="px-8 py-4 bg-gradient-to-r from-[#00bcd4] to-[#32cd32] hover:from-[#00acc1] hover:to-[#2eb82e] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#00bcd4]/30 hover:shadow-[#00bcd4]/50 hover:scale-105">
        Start Free Trial
      </button>
    </div>
  </div>
</section>
```

### Dashboard Card
```tsx
<div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#00bcd4]/50 transition-all">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-white">Review Request Automator</h3>
    <span className="px-2 py-1 bg-[#32cd32]/20 text-[#32cd32] text-xs font-medium rounded">Active</span>
  </div>
  <div className="grid grid-cols-3 gap-4 mb-4">
    <div>
      <div className="text-sm text-gray-400 mb-1">Reviews Collected</div>
      <div className="text-2xl font-bold text-white">1,247</div>
    </div>
    <div>
      <div className="text-sm text-gray-400 mb-1">Response Rate</div>
      <div className="text-2xl font-bold text-white">8.2%</div>
    </div>
    <div>
      <div className="text-sm text-gray-400 mb-1">Revenue Impact</div>
      <div className="text-2xl font-bold text-[#32cd32]">+£12k</div>
    </div>
  </div>
  <button className="w-full px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-white font-medium rounded-lg transition-all text-sm">
    View Details
  </button>
</div>
```

---

This design system ensures consistency, accessibility, and brand alignment across all VelocityApps products and marketing materials.
