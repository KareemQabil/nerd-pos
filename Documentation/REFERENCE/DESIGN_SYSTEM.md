# NerdPOS Design System - CSS Architecture

## Complete Glassmorphism Design System with Dark/Light/Luxury Themes

---

## **TABLE OF CONTENTS**

1. [Design Philosophy](#design-philosophy)
2. [Theme Architecture](#theme-architecture)
3. [Color System](#color-system)
4. [Typography System](#typography-system)
5. [Spacing & Layout](#spacing--layout)
6. [Glassmorphism Effects](#glassmorphism-effects)
7. [Component Styles](#component-styles)
8. [Animation System](#animation-system)
9. [Responsive Design](#responsive-design)
10. [RTL Support](#rtl-support)
11. [Usage Examples](#usage-examples)

---

## **DESIGN PHILOSOPHY**

### **Core Principles**

1. **Glassmorphism-First**: Modern, elegant glass effects with blur and transparency
2. **Theme-Agnostic**: All colors via CSS variables for seamless theme switching
3. **Arabic-First**: RTL by default, optimized for Arabic typography
4. **Performance**: Hardware-accelerated effects, optimized animations
5. **Accessibility**: WCAG 2.1 AA compliant contrast ratios

### **Visual Identity**

- **Primary**: Cyan (#22d3ee) - Modern, fresh, tech-forward
- **Surface**: Translucent glass with backdrop blur
- **Depth**: Layered UI with subtle shadows and borders
- **Motion**: Smooth, purposeful animations

---

## **THEME ARCHITECTURE**

### **Theme Switching Mechanism**

```typescript
// Theme toggler (React/TypeScript)
export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'luxury'>('dark');

  const toggleTheme = (newTheme: string) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    setTheme(newTheme as any);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    setTheme(savedTheme as any);
  }, []);

  return { theme, toggleTheme };
};
```

### **Theme Structure**

Each theme defines these CSS variables:

```css
:root {
  /* Brand Colors */
  --primary
  --on-primary
  --primary-container
  --on-primary-container

  /* Secondary Colors */
  --secondary
  --on-secondary
  --secondary-container
  --on-secondary-container

  /* Surfaces */
  --background
  --on-background
  --surface
  --on-surface
  --surface-variant
  --on-surface-variant

  /* Feedback Colors */
  --error
  --success
  --warning
  --info

  /* Borders & Dividers */
  --outline
  --outline-variant

  /* Glass Effects */
  --glass-light
  --glass-medium
  --glass-strong
  --glass-border
}
```

---

## **COLOR SYSTEM**

### **Light Theme**

**Philosophy**: Clean, bright, professional

```css
:root {
  /* Brand */
  --primary: #0891b2;          /* Cyan-600 - stronger for glass */
  --on-primary: #FFFFFF;
  --primary-container: rgba(8, 145, 178, 0.15);
  --on-primary-container: #0e7490;

  /* Secondary */
  --secondary: #0f172a;         /* Slate-900 */
  --on-secondary: #FFFFFF;
  --secondary-container: rgba(15, 23, 42, 0.08);
  --on-secondary-container: #1e293b;

  /* Surfaces */
  --background: #f8fafc;        /* Slate-50 */
  --on-background: #0f172a;
  --surface: rgba(255, 255, 255, 0.7);  /* Glass white */
  --on-surface: #0f172a;
  --surface-variant: rgba(241, 245, 249, 0.6);
  --on-surface-variant: #475569;

  /* Feedback */
  --success: #10b981;           /* Green-500 */
  --error: #dc2626;             /* Red-600 */
  --warning: #f59e0b;           /* Amber-500 */
  --info: #3b82f6;              /* Blue-500 */

  /* Borders */
  --outline: rgba(203, 213, 225, 0.5);
  --outline-variant: rgba(226, 232, 240, 0.4);

  /* Glass Effects */
  --glass-light: rgba(255, 255, 255, 0.7);
  --glass-medium: rgba(255, 255, 255, 0.5);
  --glass-strong: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(255, 255, 255, 0.2);
}
```

### **Dark Theme**

**Philosophy**: Elegant, eye-friendly, premium

```css
[data-theme="dark"] {
  /* Brand */
  --primary: #22d3ee;           /* Cyan-400 - vibrant for dark */
  --on-primary: #0a1929;
  --primary-container: rgba(34, 211, 238, 0.15);
  --on-primary-container: #67e8f9;

  /* Secondary */
  --secondary: #cbd5e1;         /* Slate-300 */
  --on-secondary: #0f172a;
  --secondary-container: rgba(203, 213, 225, 0.12);
  --on-secondary-container: #e2e8f0;

  /* Surfaces */
  --background: #020617;        /* Slate-950 */
  --on-background: #f1f5f9;
  --surface: rgba(15, 23, 42, 0.6);  /* Glass dark */
  --on-surface: #f1f5f9;
  --surface-variant: rgba(30, 41, 59, 0.5);
  --on-surface-variant: #cbd5e1;

  /* Feedback */
  --success: #10b981;
  --error: #f87171;             /* Red-400 */
  --warning: #fbbf24;           /* Amber-400 */
  --info: #60a5fa;              /* Blue-400 */

  /* Borders */
  --outline: rgba(71, 85, 105, 0.5);
  --outline-variant: rgba(51, 65, 85, 0.4);

  /* Glass Effects */
  --glass-light: rgba(15, 23, 42, 0.4);
  --glass-medium: rgba(15, 23, 42, 0.6);
  --glass-strong: rgba(15, 23, 42, 0.8);
  --glass-border: rgba(148, 163, 184, 0.15);
}
```

### **Luxury Theme**

**Philosophy**: Opulent, high-end, gold accents

```css
[data-theme="luxury"] {
  /* Brand - Gold */
  --primary: #f59e0b;           /* Amber-500 */
  --on-primary: #000000;
  --primary-container: rgba(245, 158, 11, 0.15);
  --on-primary-container: #fbbf24;

  /* Secondary */
  --secondary: #d97706;         /* Amber-600 */
  --on-secondary: #000000;
  --secondary-container: rgba(217, 119, 6, 0.12);
  --on-secondary-container: #f59e0b;

  /* Surfaces */
  --background: #000000;        /* Pure black */
  --on-background: #fafaf9;
  --surface: rgba(10, 10, 10, 0.65);  /* Glass black */
  --on-surface: #fafaf9;
  --surface-variant: rgba(23, 23, 23, 0.55);
  --on-surface-variant: #d6d3d1;

  /* Feedback */
  --success: #10b981;
  --error: #dc2626;
  --warning: #eab308;           /* Yellow-500 */
  --info: #3b82f6;

  /* Borders */
  --outline: rgba(120, 113, 108, 0.5);
  --outline-variant: rgba(87, 83, 78, 0.4);

  /* Glass Effects */
  --glass-light: rgba(10, 10, 10, 0.4);
  --glass-medium: rgba(10, 10, 10, 0.65);
  --glass-strong: rgba(10, 10, 10, 0.85);
  --glass-border: rgba(245, 158, 11, 0.2);  /* Gold border */
}
```

---

## **TYPOGRAPHY SYSTEM**

### **Font Stack**

```css
/* Arabic Text (Primary) */
@import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap');

/* Numbers & Prices */
/* Use system Arial for optimal number display */
.font-numbers {
  font-family: Arial, sans-serif;
}

/* English Fallback */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

### **Type Scale**

```css
/* Display (Extra Large) */
.text-display-large {
  font-size: 3.5rem;      /* 56px */
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.text-display {
  font-size: 2.5rem;      /* 40px */
  line-height: 1.2;
  font-weight: 700;
}

/* Headline (Page Titles) */
.text-headline-large {
  font-size: 2rem;        /* 32px */
  line-height: 1.25;
  font-weight: 700;
}

.text-headline {
  font-size: 1.5rem;      /* 24px */
  line-height: 1.3;
  font-weight: 700;
}

.text-headline-small {
  font-size: 1.25rem;     /* 20px */
  line-height: 1.4;
  font-weight: 700;
}

/* Title (Section Headings) */
.text-title-large {
  font-size: 1.125rem;    /* 18px */
  line-height: 1.4;
  font-weight: 700;
}

.text-title {
  font-size: 1rem;        /* 16px */
  line-height: 1.5;
  font-weight: 700;
}

.text-title-small {
  font-size: 0.875rem;    /* 14px */
  line-height: 1.5;
  font-weight: 700;
}

/* Body (Main Content) */
.text-body-large {
  font-size: 1rem;        /* 16px */
  line-height: 1.6;
  font-weight: 400;
}

.text-body {
  font-size: 0.875rem;    /* 14px */
  line-height: 1.6;
  font-weight: 400;
}

.text-body-small {
  font-size: 0.75rem;     /* 12px */
  line-height: 1.5;
  font-weight: 400;
}

/* Label (UI Elements) */
.text-label-large {
  font-size: 0.875rem;    /* 14px */
  line-height: 1.4;
  font-weight: 600;
}

.text-label {
  font-size: 0.75rem;     /* 12px */
  line-height: 1.4;
  font-weight: 600;
}

.text-label-small {
  font-size: 0.625rem;    /* 10px */
  line-height: 1.4;
  font-weight: 600;
}
```

### **Font Weights**

```css
.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.font-extrabold { font-weight: 800; }
```

---

## **SPACING & LAYOUT**

### **Spacing Scale**

Based on 4px base unit (Tailwind scale):

```css
/* Spacing Variables */
--space-0: 0px;
--space-px: 1px;
--space-0-5: 0.125rem;  /* 2px */
--space-1: 0.25rem;     /* 4px */
--space-2: 0.5rem;      /* 8px */
--space-3: 0.75rem;     /* 12px */
--space-4: 1rem;        /* 16px */
--space-5: 1.25rem;     /* 20px */
--space-6: 1.5rem;      /* 24px */
--space-8: 2rem;        /* 32px */
--space-10: 2.5rem;     /* 40px */
--space-12: 3rem;       /* 48px */
--space-16: 4rem;       /* 64px */
--space-20: 5rem;       /* 80px */
--space-24: 6rem;       /* 96px */
```

### **Common Spacing Patterns**

```css
/* Card Padding */
.card-padding-sm { padding: var(--space-4); }      /* 16px */
.card-padding { padding: var(--space-6); }         /* 24px */
.card-padding-lg { padding: var(--space-8); }      /* 32px */

/* Section Spacing */
.section-gap { gap: var(--space-6); }              /* 24px */
.section-padding { padding: var(--space-8) 0; }    /* 32px vertical */

/* Item Gaps */
.gap-tight { gap: var(--space-2); }                /* 8px */
.gap-normal { gap: var(--space-4); }               /* 16px */
.gap-relaxed { gap: var(--space-6); }              /* 24px */
```

### **Border Radius Scale**

```css
--radius-sm: 0.375rem;    /* 6px */
--radius: 0.5rem;         /* 8px */
--radius-md: 0.75rem;     /* 12px */
--radius-lg: 1rem;        /* 16px */
--radius-xl: 1.5rem;      /* 24px */
--radius-2xl: 2rem;       /* 32px */
--radius-full: 9999px;    /* Fully rounded */
```

---

## **GLASSMORPHISM EFFECTS**

### **Core Glass Classes**

```css
/* Light Glass (Subtle) */
.glass-light {
  background: var(--glass-light);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

/* Medium Glass (Standard) */
.glass {
  background: var(--glass-medium);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
}

/* Strong Glass (Opaque) */
.glass-strong {
  background: var(--glass-strong);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
}

/* Hover State */
.glass:hover {
  border-color: var(--primary);
  box-shadow: 0 8px 32px color-mix(in srgb, var(--primary) 15%, transparent);
  transform: translateY(-2px);
  transition: all 300ms ease;
}
```

### **Specialized Glass Effects**

```css
/* Frosted Glass (Heavy Blur) */
.glass-frosted {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

/* Tinted Glass */
.glass-tinted-primary {
  background: color-mix(in srgb, var(--primary) 10%, var(--glass-medium));
  backdrop-filter: blur(24px);
  border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
}

.glass-tinted-success {
  background: color-mix(in srgb, var(--success) 10%, var(--glass-medium));
  backdrop-filter: blur(24px);
  border: 1px solid color-mix(in srgb, var(--success) 30%, transparent);
}

.glass-tinted-error {
  background: color-mix(in srgb, var(--error) 10%, var(--glass-medium));
  backdrop-filter: blur(24px);
  border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
}
```

### **Glass Layers (Z-Index)**

```css
.glass-layer-0 { z-index: 0; }    /* Background layer */
.glass-layer-1 { z-index: 10; }   /* Cards, panels */
.glass-layer-2 { z-index: 20; }   /* Elevated cards */
.glass-layer-3 { z-index: 30; }   /* Dropdowns */
.glass-layer-4 { z-index: 40; }   /* Modals */
.glass-layer-5 { z-index: 50; }   /* Tooltips, toasts */
```

---

## **COMPONENT STYLES**

### **Buttons**

```css
/* Primary Button */
.btn-primary {
  background: linear-gradient(
    to bottom right,
    var(--primary),
    color-mix(in srgb, var(--primary) 80%, transparent)
  );
  color: var(--on-primary);
  font-weight: 700;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-lg);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 15px color-mix(in srgb, var(--primary) 25%, transparent);
  transition: all 300ms ease;
}

.btn-primary:hover {
  box-shadow: 0 20px 25px color-mix(in srgb, var(--primary) 40%, transparent);
  transform: scale(1.02);
}

.btn-primary:active {
  transform: scale(0.98);
}

/* Secondary Button */
.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(24px);
  border: 2px solid var(--outline);
  color: var(--primary);
  font-weight: 700;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-lg);
  transition: all 300ms ease;
}

.btn-secondary:hover {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border-color: color-mix(in srgb, var(--primary) 50%, transparent);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

/* Ghost Button */
.btn-ghost {
  background: transparent;
  color: var(--on-surface);
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-lg);
  transition: all 200ms ease;
}

.btn-ghost:hover {
  background: var(--surface-variant);
}

/* Icon Button */
.btn-icon {
  background: var(--glass-light);
  backdrop-filter: blur(16px);
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--glass-border);
  transition: all 200ms ease;
}

.btn-icon:hover {
  background: var(--glass-medium);
  border-color: var(--primary);
}
```

### **Cards**

```css
/* Standard Card */
.card {
  backdrop-filter: blur(48px);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--glass-border);
  background: var(--glass-medium);
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.05);
  transition: all 300ms ease;
}

.card:hover {
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
  border-color: color-mix(in srgb, var(--primary) 20%, transparent);
  transform: translateY(-4px);
}

/* Interactive Card (Clickable) */
.card-interactive {
  cursor: pointer;
  user-select: none;
}

.card-interactive:active {
  transform: scale(0.98);
}

/* Stat Card */
.card-stat {
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  background: var(--glass-strong);
  border: 1px solid var(--outline-variant);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
}

.card-stat-value {
  font-size: 2rem;
  font-weight: 700;
  font-family: Arial, sans-serif;
  color: var(--on-surface);
}

.card-stat-label {
  font-size: 0.875rem;
  color: var(--on-surface-variant);
}
```

### **Inputs**

```css
/* Text Input */
.input {
  background: var(--glass-light);
  backdrop-filter: blur(16px);
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  color: var(--on-surface);
  font-size: 0.875rem;
  transition: all 200ms ease;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
  background: var(--surface);
}

.input::placeholder {
  color: var(--on-surface-variant);
  opacity: 0.6;
}

/* Number Input (RTL-aware) */
.input-number {
  font-family: Arial, sans-serif;
  text-align: left;
  direction: ltr;
}

/* Search Input */
.input-search {
  padding-right: 2.5rem; /* Space for icon */
  background-image: url("data:image/svg+xml,..."); /* Search icon */
  background-position: right 1rem center;
  background-repeat: no-repeat;
}
```

### **Badges**

```css
/* Base Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  backdrop-filter: blur(12px);
  border: 1px solid transparent;
}

/* Variants */
.badge-primary {
  background: var(--primary-container);
  color: var(--on-primary-container);
  border-color: color-mix(in srgb, var(--primary) 30%, transparent);
}

.badge-success {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 30%, transparent);
}

.badge-error {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 30%, transparent);
}

.badge-warning {
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  color: var(--warning);
  border-color: color-mix(in srgb, var(--warning) 30%, transparent);
}

/* Count Badge (Notification) */
.badge-count {
  background: var(--error);
  color: white;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  min-width: 1.25rem;
  text-align: center;
}
```

---

## **ANIMATION SYSTEM**

### **Keyframe Animations**

```css
/* Pulse Glow */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 40%, transparent);
  }
  50% {
    box-shadow: 0 0 20px 8px color-mix(in srgb, var(--primary) 20%, transparent);
  }
}

/* Breathe (Subtle Scale) */
@keyframes breathe {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.02);
    opacity: 0.9;
  }
}

/* Shimmer (Loading) */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Float (Hover Effect) */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}

/* Slide Up (Enter Animation) */
@keyframes slide-up {
  0% {
    transform: translateY(100%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Fade In */
@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* Scale In */
@keyframes scale-in {
  0% {
    transform: scale(0.9);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

### **Animation Utility Classes**

```css
.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

.animate-breathe {
  animation: breathe 3s ease-in-out infinite;
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.15) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}
```

### **Transition Presets**

```css
.transition-fast {
  transition: all 150ms ease;
}

.transition-normal {
  transition: all 300ms ease;
}

.transition-slow {
  transition: all 500ms ease;
}

.transition-colors {
  transition: background-color 200ms ease, color 200ms ease;
}

.transition-transform {
  transition: transform 300ms ease;
}
```

---

## **RESPONSIVE DESIGN**

### **Breakpoints**

```css
/* Mobile First Approach */
/* Default: Mobile (0-639px) */

/* Small Tablets */
@media (min-width: 640px) { /* sm */ }

/* Tablets */
@media (min-width: 768px) { /* md */ }

/* Small Laptops */
@media (min-width: 1024px) { /* lg */ }

/* Desktops */
@media (min-width: 1280px) { /* xl */ }

/* Large Desktops */
@media (min-width: 1536px) { /* 2xl */ }
```

### **Responsive Utilities (Tailwind)**

```html
<!-- Hide on mobile, show on desktop -->
<div class="hidden lg:block">Desktop Only</div>

<!-- Stack on mobile, row on desktop -->
<div class="flex flex-col lg:flex-row gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Responsive padding -->
<div class="p-4 lg:p-8">Content</div>

<!-- Responsive grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- Cards -->
</div>
```

---

## **RTL SUPPORT**

### **Direction Setup**

```html
<!-- Set direction based on language -->
<html dir="rtl" lang="ar">
  <!-- Arabic UI -->
</html>

<html dir="ltr" lang="en">
  <!-- English UI -->
</html>
```

### **RTL-Aware Styles**

```css
/* Auto-flip margins/paddings */
.ml-4 {
  margin-left: 1rem; /* LTR */
  /* Automatically becomes margin-right in RTL */
}

/* Explicit RTL overrides */
.ml-4-rtl {
  margin-left: 1rem;
}

[dir="rtl"] .ml-4-rtl {
  margin-left: 0;
  margin-right: 1rem;
}

/* Logical properties (direction-agnostic) */
.start-4 {
  inset-inline-start: 1rem; /* Left in LTR, right in RTL */
}

.end-4 {
  inset-inline-end: 1rem; /* Right in LTR, left in RTL */
}
```

### **Number Display (Always LTR)**

```html
<!-- Force LTR for numbers even in RTL layout -->
<span class="font-inter" dir="ltr">
  123.45 SAR
</span>
```

---

## **USAGE EXAMPLES**

### **Example 1: Product Card**

```html
<div class="glass rounded-xl p-4 hover:glass-strong transition-normal cursor-pointer">
  <!-- Image -->
  <div class="aspect-square bg-surface-variant rounded-lg overflow-hidden mb-3">
    <img src="product.jpg" class="w-full h-full object-cover" />
  </div>
  
  <!-- Info -->
  <h3 class="text-title font-bold text-on-surface mb-1">
    برجر دجاج
  </h3>
  
  <div class="flex items-center justify-between">
    <span class="text-headline-small font-bold font-inter text-primary">
      45.00 SAR
    </span>
    <span class="badge badge-success">متوفر</span>
  </div>
</div>
```

### **Example 2: Dashboard Stat Card**

```html
<div class="card-stat">
  <div class="card-stat-icon">
    <svg>...</svg>
  </div>
  
  <div class="card-stat-value">
    12,450
  </div>
  
  <div class="card-stat-label">
    إجمالي المبيعات
  </div>
  
  <div class="flex items-center gap-2 text-success text-body-small">
    <svg>↑</svg>
    <span>+12% من الأمس</span>
  </div>
</div>
```

### **Example 3: Primary Button**

```html
<button class="btn-primary">
  <svg class="w-5 h-5 ml-2"><!-- Icon --></svg>
  <span>الدفع</span>
</button>
```

### **Example 4: Form Input**

```html
<div class="space-y-2">
  <label class="text-label text-on-surface-variant">
    اسم المنتج
  </label>
  
  <input
    type="text"
    class="input w-full"
    placeholder="أدخل اسم المنتج"
  />
  
  <span class="text-body-small text-error">
    هذا الحقل مطلوب
  </span>
</div>
```

### **Example 5: Modal**

```html
<div class="fixed inset-0 glass-layer-4 flex items-center justify-center p-4">
  <!-- Backdrop -->
  <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
  
  <!-- Modal -->
  <div class="glass-strong rounded-2xl p-6 max-w-md w-full relative animate-scale-in">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-headline font-bold">تأكيد الحذف</h2>
      <button class="btn-icon">
        <svg>×</svg>
      </button>
    </div>
    
    <!-- Content -->
    <p class="text-body text-on-surface-variant mb-6">
      هل أنت متأكد من حذف هذا العنصر؟
    </p>
    
    <!-- Actions -->
    <div class="flex gap-3">
      <button class="btn-secondary flex-1">إلغاء</button>
      <button class="btn-primary flex-1 bg-error">حذف</button>
    </div>
  </div>
</div>
```

---

## **ACCESSIBILITY NOTES**

### **Color Contrast**

All color combinations meet WCAG 2.1 AA standards:
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text (18px+)**: Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio

### **Focus States**

```css
/* Keyboard focus indicators */
*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Remove default focus, add custom */
.btn-primary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent);
}
```

### **Reduced Motion**

```css
/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## **PERFORMANCE TIPS**

1. **Use `will-change` sparingly** for animations
2. **Optimize backdrop-filter** usage (GPU-intensive)
3. **Lazy-load images** with `loading="lazy"`
4. **Use CSS `contain` property** for isolated components
5. **Minimize repaints** with `transform` instead of `top/left`

```css
/* Performance-optimized animation */
.optimized-animation {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force GPU acceleration */
}
```

---

**This design system is a living document. Update as the UI evolves!** 🎨
