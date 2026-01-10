# Theme System - Glassmorphism

**Themes**: Light, Dark, Luxury  
**Method**: CSS Variables  
**Special**: RTL Support  

---

## **CSS VARIABLES**

```css
/* styles/themes/light.css */
:root[data-theme="light"] {
  /* Colors */
  --primary: 59 130 246;      /* blue-600 */
  --secondary: 107 114 128;   /* gray-500 */
  --success: 34 197 94;       /* green-500 */
  --danger: 239 68 68;        /* red-500 */
  --warning: 251 146 60;      /* orange-500 */
  
  /* Backgrounds */
  --bg-primary: 255 255 255;
  --bg-secondary: 249 250 251;
  --bg-tertiary: 243 244 246;
  
  /* Text */
  --text-primary: 17 24 39;
  --text-secondary: 107 114 128;
  --text-tertiary: 156 163 175;
  
  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(255, 255, 255, 0.18);
  --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

:root[data-theme="dark"] {
  --primary: 96 165 250;
  --bg-primary: 17 24 39;
  --bg-secondary: 31 41 55;
  --text-primary: 243 244 246;
  
  --glass-bg: rgba(17, 24, 39, 0.7);
  --glass-border: rgba(255, 255, 255, 0.1);
}

:root[data-theme="luxury"] {
  --primary: 217 119 6;       /* amber-600 */
  --secondary: 161 98 7;      /* amber-700 */
  
  --glass-bg: rgba(0, 0, 0, 0.4);
  --glass-border: rgba(217, 119, 6, 0.2);
}
```

---

## **GLASSMORPHISM COMPONENTS**

```css
/* Glassmorphism utility class */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.glass-card {
  @apply glass rounded-lg p-6;
}

.glass-button {
  @apply glass rounded-md px-4 py-2 transition-all;
  @apply hover:brightness-110 active:brightness-90;
}
```

---

## **TAILWIND CONFIG**

```javascript
// tailwind.config.js
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--primary) / <alpha-value>)',
        secondary: 'rgb(var(--secondary) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      backgroundColor: {
        primary: 'rgb(var(--bg-primary) / <alpha-value>)',
        secondary: 'rgb(var(--bg-secondary) / <alpha-value>)',
      },
      textColor: {
        primary: 'rgb(var(--text-primary) / <alpha-value>)',
        secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
```

---

## **THEME SWITCHER**

```tsx
// components/ThemeSwitcher.tsx
import { useUIStore } from '@/lib/stores/ui';

export function ThemeSwitcher() {
  const { theme, setTheme } = useUIStore();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setTheme('light')}
        className={`px-4 py-2 rounded ${theme === 'light' ? 'glass-button' : ''}`}
      >
        Light
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-4 py-2 rounded ${theme === 'dark' ? 'glass-button' : ''}`}
      >
        Dark
      </button>
      <button
        onClick={() => setTheme('luxury')}
        className={`px-4 py-2 rounded ${theme === 'luxury' ? 'glass-button' : ''}`}
      >
        Luxury
      </button>
    </div>
  );
}
```

---

## **RTL SUPPORT**

```css
/* RTL utilities */
[dir="rtl"] {
  direction: rtl;
}

[dir="rtl"] .ml-4 {
  margin-left: 0;
  margin-right: 1rem;
}

/* Or use Tailwind RTL plugin */
.ml-4.rtl\:mr-4.rtl\:ml-0 {
  /* Auto-handled */
}
```

---

**Backend Complete | Frontend Complete | All Workflows Complete**
