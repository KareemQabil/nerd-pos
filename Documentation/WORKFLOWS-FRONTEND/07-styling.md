# Styling Guide

**Framework**: TailwindCSS  
**Method**: Utility classes + CSS variables  
**Special**: Glassmorphism effects  

---

## **TAILWIND UTILITIES**

```tsx
// Common patterns
<div className="flex items-center justify-between">
  <h1 className="text-3xl font-bold text-gray-900">Title</h1>
  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
    Action
  </button>
</div>

// Grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>

// Glassmorphism
<div className="glass rounded-lg p-6">
  <h2 className="text-xl font-bold">Glass Card</h2>
</div>
```

---

## **CUSTOM UTILITIES**

```css
/* globals.css */
@layer utilities {
  .glass {
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }

  .text-shadow {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .btn-primary {
    @apply px-4 py-2 bg-primary text-white rounded-lg;
    @apply hover:brightness-110 active:brightness-90;
    @apply transition-all duration-150;
  }
}
```

---

## **RTL SUPPORT**

```tsx
// Automatic with Tailwind
<div className="ml-4 rtl:mr-4 rtl:ml-0">
  Content
</div>

// Or use start/end
<div className="ms-4"> {/* margin-inline-start */}
  Content
</div>
```

---

**NEXT**: [08-testing.md](08-testing.md)
