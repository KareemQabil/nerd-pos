# NerdPOS UI/UX Hierarchy Structure Guide
## Complete Design System Organization & Visual Hierarchy

---

## **TABLE OF CONTENTS**

1. [Visual Hierarchy Principles](#visual-hierarchy-principles)
2. [Component Hierarchy (Atomic Design)](#component-hierarchy-atomic-design)
3. [Layout Hierarchy](#layout-hierarchy)
4. [Typography Hierarchy](#typography-hierarchy)
5. [Color Hierarchy](#color-hierarchy)
6. [Spacing & Sizing Hierarchy](#spacing--sizing-hierarchy)
7. [Z-Index Hierarchy](#z-index-hierarchy)
8. [Interactive States Hierarchy](#interactive-states-hierarchy)
9. [Information Architecture](#information-architecture)
10. [Navigation Hierarchy](#navigation-hierarchy)
11. [Animation Hierarchy](#animation-hierarchy)
12. [Accessibility Hierarchy](#accessibility-hierarchy)

---

## **VISUAL HIERARCHY PRINCIPLES**

### **Core Philosophy**
NerdPOS uses a **feature-first, RTL-optimized, multi-theme hierarchy** that prioritizes:
1. **Action-oriented design** - Most important actions are most prominent
2. **Contextual relevance** - Elements appear when needed
3. **Progressive disclosure** - Complex features revealed gradually
4. **Cultural adaptation** - Arabic-first with strong bilingual support

### **The 5-Level Attention System**

#### **Level 1: Primary Actions** (Impossible to Miss)
- **Visual Weight**: Highest
- **Examples**:
  - Checkout button (POS)
  - Save button (Forms)
  - Primary CTA in modals
- **Characteristics**:
  - Gradient backgrounds (cyan #22d3ee → blue #006399)
  - Large shadows (0px 1px 2px rgba(0,0,0,0.3), 0px 2px 6px rgba(0,0,0,0.15))
  - Bigger size (56px height minimum)
  - Bold text (16px+)
  - Animation on hover (scale 1.05)

#### **Level 2: Secondary Actions** (Easy to Find)
- **Visual Weight**: High
- **Examples**:
  - Cart button
  - Filter buttons
  - Quick action buttons
- **Characteristics**:
  - Solid backgrounds with borders
  - Medium shadows
  - Standard size (48px height)
  - Medium text (14px)
  - Subtle hover effects

#### **Level 3: Tertiary Actions** (Available When Needed)
- **Visual Weight**: Medium
- **Examples**:
  - Delete buttons
  - Edit buttons
  - Additional options
- **Characteristics**:
  - Transparent/ghost backgrounds
  - Thin borders or no borders
  - Small to medium size (40-48px)
  - Smaller text (12-14px)
  - Reveal on hover (opacity changes)

#### **Level 4: Informational Elements** (Passive)
- **Visual Weight**: Low
- **Examples**:
  - Labels
  - Descriptions
  - Metadata
  - Timestamps
- **Characteristics**:
  - No background
  - Muted colors (--on-surface-variant)
  - Small text (10-12px)
  - No interaction effects

#### **Level 5: Decorative Elements** (Background)
- **Visual Weight**: Minimal
- **Examples**:
  - Dividers
  - Backgrounds
  - Gradients
  - Shadows
- **Characteristics**:
  - Subtle opacity (5-10%)
  - Blend modes
  - No semantic meaning
  - Purely aesthetic

---

## **COMPONENT HIERARCHY (ATOMIC DESIGN)**

### **Atomic Structure Overview**

```
Atoms (Basic Building Blocks)
    ↓
Molecules (Simple Combinations)
    ↓
Organisms (Complex Components)
    ↓
Templates (Page Layouts)
    ↓
Pages (Full Screens)
```

### **ATOMS** (Smallest Indivisible Components)

#### **Inputs**
- Text input
- Number input
- Date input
- Textarea
- Checkbox
- Radio button
- Switch toggle
- Slider

**Location**: `/components/form-inputs.tsx`, `/components/ui/input.tsx`

**Properties**:
- Single responsibility
- No internal layout complexity
- Reusable across entire system
- Theme-aware via CSS variables

#### **Buttons**
- Primary button
- Secondary button
- Ghost button
- Icon button
- Action button

**Location**: `/components/ui/button.tsx`, `/components/action-button.tsx`

**Variants**:
```typescript
variant: 'default' | 'primary' | 'secondary' | 'ghost' | 'link'
size: 'sm' | 'md' | 'lg' | 'icon'
```

#### **Typography**
- Headings (H1-H6)
- Body text
- Labels
- Captions
- Code

**Location**: `/styles/globals.css` (base styles)

**Fonts**:
- Arabic: Almarai (400, 700)
- Numbers: Arial
- English: Inter (fallback)

#### **Icons**
- Lucide React icons (20x20, 24x24, 16x16)
- Custom SVG imports
- Badge indicators

**Location**: Imported from `lucide-react`

#### **Badges & Tags**
- Status badges
- Count badges
- Category tags

**Location**: `/components/status-badge.tsx`, `/components/ui/badge.tsx`

---

### **MOLECULES** (Simple Combinations)

#### **Form Fields**
- Label + Input + Error message
- Label + Dropdown + Helper text
- Label + Checkbox + Description

**Location**: `/components/form-inputs.tsx`

**Structure**:
```tsx
<FormField>
  <Label />
  <Input />
  <HelperText />
  <ErrorMessage />
</FormField>
```

#### **Cards**
- Header + Content + Footer
- Image + Title + Description + Action

**Location**: `/components/card.tsx`, `/components/ui/card.tsx`

**Variants**:
- Simple card (padding + border + rounded)
- Interactive card (hover states + click)
- Stat card (icon + value + label)

#### **Search Bars**
- Input + Search icon + Clear button

**Location**: Inline in various screens (POS, Inventory, etc.)

**Pattern**:
```tsx
<div className="relative">
  <input type="text" />
  <SearchIcon className="absolute left-4" />
  {hasValue && <ClearButton />}
</div>
```

#### **List Items**
- Avatar/Icon + Title + Subtitle + Action
- Checkbox + Label + Badge

**Location**: Cart items, order items, customer lists

---

### **ORGANISMS** (Complex Components)

#### **Navigation Components**
1. **Main Navigation** (`/components/main-navigation.tsx`)
   - Logo
   - Navigation items (16)
   - User avatar
   - Logout button

2. **Breadcrumbs** (`/components/ui/breadcrumb.tsx`)
   - Home icon
   - Separator
   - Path segments

#### **Data Display**
1. **Data Table** (`/components/data-table.tsx`)
   - Header row
   - Body rows
   - Pagination
   - Sorting indicators
   - Actions column

2. **Stat Cards Grid** (`/components/quick-stats-card.tsx`)
   - Icon
   - Value
   - Label
   - Trend indicator

#### **Modal Dialogs**
1. **Payment Modal** (`/features/pos/components/payment-modal-redesigned.tsx`)
   - Header (title + close)
   - Body (payment methods + amount input)
   - Footer (actions)
   - Summary panel

2. **Form Modals** (Product, Customer, etc.)
   - Header
   - Form fields
   - Actions (cancel + submit)

**Pattern**:
```tsx
<Modal>
  <ModalHeader>
    <Title />
    <CloseButton />
  </ModalHeader>
  <ModalBody>
    {/* Content */}
  </ModalBody>
  <ModalFooter>
    <CancelButton />
    <SubmitButton />
  </ModalFooter>
</Modal>
```

#### **Panels**
1. **Cart Panel** (`/features/pos/components/cart-panel.tsx`)
   - Fixed header
   - Scrollable content
   - Fixed footer (summary)

2. **Filter Panel** (`/components/filter-panel.tsx`)
   - Filter groups
   - Apply/Reset buttons

---

### **TEMPLATES** (Page Layouts)

#### **Dashboard Layout**
```
┌─────────────────────────────────────────┐
│ Header (Title + Actions)               │
├─────────────────────────────────────────┤
│ Stats Grid (Quick Stats Cards)         │
├─────────────────────────────────────────┤
│ Main Content (Charts/Tables)           │
└─────────────────────────────────────────┘
```

**Components**:
- Section header
- Stats row (4 cards)
- Content grid

#### **List/Table Layout**
```
┌─────────────────────────────────────────┐
│ Header (Title + Search + Filters)      │
├─────────────────────────────────────────┤
│ Data Table                              │
│ - Headers                               │
│ - Rows                                  │
│ - Pagination                            │
└─────────────────────────────────────────┘
```

**Components**:
- Section header
- Filter panel
- Data table
- Pagination

#### **Form Layout**
```
┌─────────────────────────────────────────┐
│ Header (Title + Breadcrumbs)           │
├─────────────────────────────────────────┤
│ Form Grid (2 columns)                  │
│ - Field 1    - Field 2                 │
│ - Field 3    - Field 4                 │
├─────────────────────────────────────────┤
│ Actions (Cancel + Submit)              │
└─────────────────────────────────────────┘
```

#### **POS Layout** (Special)
```
┌─────────────────────────────────────────────┐
│ Categories + Search                    │Nav│
├────────────────────────────────────────┤   │
│ Product Grid                           │   │
│ - Card  Card  Card  Card               │   │
├────────────────────────────────────────┤   │
│ Action Bar (Sticky Bottom)             │   │
└────────────────────────────────────────┴───┘
  Cart Panel (Slides from left)
```

---

### **PAGES** (Full Screens)

#### **Screen Types**
1. **Dashboard Screens** - Overview + stats + charts
2. **List Screens** - Data tables + filters
3. **Detail Screens** - Single item details + actions
4. **Form Screens** - Create/edit forms
5. **Transaction Screens** - POS, payment flows

**Common Elements** (All Screens):
- Main navigation (right sidebar, 80px)
- Page header (title, actions, breadcrumbs)
- Content area (responsive, scrollable)
- Modals (conditional overlays)

---

## **LAYOUT HIERARCHY**

### **Grid System**

#### **Responsive Breakpoints**
```css
/* Tailwind defaults */
sm:  640px  /* Small tablets */
md:  768px  /* Tablets */
lg:  1024px /* Small desktops */
xl:  1280px /* Desktops */
2xl: 1536px /* Large desktops */
```

#### **Column Grid Patterns**

**2-Column** (Forms, Details):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Field />
  <Field />
</div>
```

**3-Column** (Medium density):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>
```

**4-Column** (Stats, High density):
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard />
  <StatCard />
  <StatCard />
  <StatCard />
</div>
```

**5-Column** (POS Products):
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
  <Product />
  {/* ... */}
</div>
```

### **Container Widths**

#### **Standard Container**
```tsx
<div className="container mx-auto px-4">
  {/* Full width with auto margins */}
</div>
```

#### **Fixed Sidebars**
- **Navigation**: 80px (fixed)
- **Cart Panel**: 380px (fixed)
- **Filter Sidebar**: 280px (typical)

#### **Content Margins**
- **With Sidebar**: `pr-20` (80px right padding)
- **With Cart Open**: `ml-[400px]` (400px left margin)

### **Spacing Scale**

#### **Padding/Margin Values**
```css
/* Tailwind spacing scale */
px (1px)   - Hairline dividers
0.5 (2px)  - Tight spacing
1 (4px)    - Minimal gap
2 (8px)    - Default gap between related items
3 (12px)   - Small section padding
4 (16px)   - Standard gap, card padding
5 (20px)   - Medium spacing
6 (24px)   - Section padding
8 (32px)   - Large spacing
12 (48px)  - Extra large spacing
16 (64px)  - Screen padding
20 (80px)  - Major section spacing
24 (96px)  - Bottom padding for sticky bars
```

#### **Common Patterns**
- **Card padding**: `p-4` to `p-6` (16-24px)
- **Modal padding**: `p-6` (24px)
- **Screen padding**: `px-4` to `px-6`, `py-6` (16-24px horizontal, 24px vertical)
- **Gap between items**: `gap-2` to `gap-4` (8-16px)
- **Section spacing**: `space-y-6` (24px vertical)

---

## **TYPOGRAPHY HIERARCHY**

### **Font Families**

```css
/* Primary: Arabic Text */
font-family: 'Almarai', sans-serif;
weights: 400 (regular), 700 (bold)

/* Secondary: Numbers & Prices */
font-family: 'Arial', sans-serif;
weights: 400, 700

/* Fallback: English */
font-family: 'Inter', sans-serif;
weights: 400-800
```

### **Type Scale**

#### **Display Sizes** (Headings)
```css
/* Page Titles */
H1: text-4xl (36px) - font-bold - Almarai
    Example: Screen titles

/* Section Titles */
H2: text-3xl (30px) - font-bold - Almarai
    Example: Modal titles, major sections

/* Subsection Titles */
H3: text-2xl (24px) - font-bold - Almarai
    Example: Card titles, panel headers

/* Component Titles */
H4: text-xl (20px) - font-bold - Almarai
    Example: Form section headers

/* Small Headings */
H5: text-lg (18px) - font-bold - Almarai
    Example: List item titles

H6: text-base (16px) - font-bold - Almarai
    Example: Compact headings
```

#### **Body Sizes**
```css
/* Large Body */
text-lg (18px) - font-normal - Almarai
Example: Emphasized paragraphs

/* Standard Body */
text-base (16px) - font-normal - Almarai
Example: Default text, input text

/* Small Body */
text-sm (14px) - font-normal - Almarai
Example: Helper text, secondary info

/* Extra Small */
text-xs (12px) - font-normal - Almarai
Example: Labels, metadata

/* Tiny */
text-[10px] - font-normal - Almarai
Example: Badges, timestamps, footnotes

/* Micro */
text-[9px] - font-bold - Almarai
Example: Sidebar labels, compact UI

/* Minimal */
text-[8px] - font-normal - Almarai
Example: User name under avatar
```

#### **Number/Price Typography**
```css
/* Large Numbers */
text-4xl (36px) - font-bold - Arial
Example: Dashboard totals

/* Medium Numbers */
text-2xl (24px) - font-bold - Arial
Example: Cart total, stat values

/* Standard Numbers */
text-xl (20px) - font-bold - Arial
Example: Prices, quantities

/* Small Numbers */
text-base (16px) - font-bold - Arial
Example: Inline prices

/* Tiny Numbers */
text-sm (14px) - font-bold - Arial
Example: Badge counts, small stats
```

### **Line Heights**

```css
/* Tight (Headings) */
leading-tight (1.25)

/* Normal (Body) */
leading-normal (1.5)

/* Relaxed (Readable paragraphs) */
leading-relaxed (1.625)

/* Loose (Wide spacing) */
leading-loose (2)
```

### **Font Weights**

```css
/* Regular */
font-normal (400) - Body text, descriptions

/* Bold */
font-bold (700) - Headings, emphasis, buttons, prices
```

### **Text Direction & Alignment**

```css
/* Automatic Direction */
dir="auto" - Detects language, switches RTL/LTR

/* RTL Forced */
dir="rtl" - Arabic content

/* Alignment */
text-right - Default for RTL
text-left - Numbers, English
text-center - Centered content
```

### **Typography Usage Map**

| Element | Size | Weight | Font | Color |
|---------|------|--------|------|-------|
| Screen Title | text-4xl | bold | Almarai | --on-surface |
| Modal Title | text-2xl | bold | Almarai | --on-surface |
| Card Title | text-lg | bold | Almarai | --on-surface |
| Button Text | text-base | bold | Almarai | varies |
| Body Text | text-base | normal | Almarai | --on-surface |
| Label | text-sm | normal | Almarai | --on-surface-variant |
| Helper Text | text-xs | normal | Almarai | --on-surface-variant |
| Price (Large) | text-2xl | bold | Arial | --primary |
| Price (Small) | text-base | bold | Arial | --primary |
| Badge Count | text-[10px] | bold | Arial | white |
| Timestamp | text-xs | normal | Almarai | --on-surface-variant |

---

## **COLOR HIERARCHY**

### **Theme Layers**

#### **Layer 1: Backgrounds** (Darkest)
```css
/* Base Background */
--background: Theme-dependent
Light: #FFFFFF
Dark: #001219
Luxury: #1a1a1a

/* Surface (Cards, Panels) */
--surface: Slightly lighter than background
Light: #F9FAFB
Dark: #1a1c1e
Luxury: #2a2a2a

/* Surface Variant (Elevated) */
--surface-variant: Lighter still
Light: #F3F4F6
Dark: #2a2c2e
Luxury: #3a3a3a
```

#### **Layer 2: Borders & Dividers**
```css
/* Outline (Strong borders) */
--outline: Medium opacity
Light: rgba(0,0,0,0.2)
Dark: rgba(255,255,255,0.2)

/* Outline Variant (Subtle borders) */
--outline-variant: Low opacity
Light: rgba(0,0,0,0.1)
Dark: rgba(255,255,255,0.1)
```

#### **Layer 3: Text** (Lightest)
```css
/* Primary Text */
--on-surface: High contrast
Light: #1F2937
Dark: #e2e2e6

/* Secondary Text */
--on-surface-variant: Medium contrast
Light: #6B7280
Dark: #c2c7ce

/* Disabled Text */
--on-surface-disabled: Low contrast
Light: #D1D5DB
Dark: rgba(255,255,255,0.3)
```

### **Semantic Colors**

#### **Primary (Brand - Cyan)**
```css
--primary: #22d3ee (Cyan 400)
--primary-dark: #006399
--on-primary: #00373a (Dark text on cyan)

/* Gradients */
from-[#22d3ee] to-[#006399] - Standard gradient
from-[#22d3ee] to-[#0891b2] - Alternative
```

**Usage**:
- Primary buttons
- Active states
- Links
- Highlights
- Prices

#### **Success (Green)**
```css
--success: #10b981 (Green 500)
--success-dark: #059669
--success-container: rgba(16, 185, 129, 0.2)
--on-success: #FFFFFF

/* Gradients */
from-[#10b981] to-[#059669]
```

**Usage**:
- Success messages
- Positive feedback
- Confirmed states
- Available stock

#### **Warning (Orange)**
```css
--warning: #f59e0b (Orange 500)
--warning-dark: #d97706
--warning-container: rgba(245, 158, 11, 0.2)
--on-warning: #FFFFFF

/* Gradients */
from-[#f59e0b] to-[#d97706]
```

**Usage**:
- Hold order button
- Low stock warnings
- Caution states

#### **Error (Red)**
```css
--error: #ef4444 (Red 500)
--error-dark: #dc2626
--error-container: rgba(239, 68, 68, 0.2)
--on-error: #FFFFFF

/* Special: Delete color */
#fb2c36 - Vibrant red for delete actions
```

**Usage**:
- Error messages
- Delete buttons
- Negative discounts
- Out of stock

#### **Info (Blue)**
```css
--info: #3b82f6 (Blue 500)
--info-dark: #2563eb
--info-container: rgba(59, 130, 246, 0.2)
--on-info: #FFFFFF
```

**Usage**:
- Info messages
- Neutral feedback
- General notices

### **Module Colors** (Navigation)

Each module has a unique gradient:

```css
Dashboard:  from-[#22d3ee] to-[#0891b2]  /* Cyan */
POS:        from-[#22d3ee] to-[#006399]  /* Cyan-Blue */
Orders:     from-[#f59e0b] to-[#d97706]  /* Orange */
Customers:  from-[#10b981] to-[#059669]  /* Green */
Sales:      from-[#06b6d4] to-[#0284c7]  /* Light Blue */
Inventory:  from-[#8b5cf6] to-[#6d28d9]  /* Purple */
B2B:        from-[#ec4899] to-[#db2777]  /* Pink */
Reports:    from-[#06b6d4] to-[#0891b2]  /* Cyan-Blue */
HR:         from-[#f97316] to-[#ea580c]  /* Dark Orange */
Cash:       from-[#84cc16] to-[#65a30d]  /* Lime */
Delivery:   from-[#06b6d4] to-[#0e7490]  /* Teal */
Kitchen:    from-[#ef4444] to-[#dc2626]  /* Red */
Analytics:  from-[#a855f7] to-[#7c3aed]  /* Purple */
Settings:   from-[#6b7280] to-[#4b5563]  /* Gray */
Seating:    from-[#ec4899] to-[#db2777]  /* Pink */
Design:     from-[#f472b6] to-[#ec4899]  /* Light Pink */
```

### **Opacity Scale**

```css
/* Transparent Overlays */
rgba(255,255,255,0.03) - Barely visible highlight
rgba(255,255,255,0.05) - Subtle background
rgba(255,255,255,0.1)  - Light background, borders
rgba(255,255,255,0.2)  - Medium emphasis
rgba(255,255,255,0.3)  - Strong emphasis
rgba(255,255,255,0.5)  - Semi-transparent
rgba(255,255,255,0.9)  - Nearly opaque

/* Dark Overlays */
rgba(0,0,0,0.15)  - Subtle shadow
rgba(0,0,0,0.3)   - Medium shadow
rgba(0,0,0,0.5)   - Modal backdrop
rgba(0,0,0,0.8)   - Strong backdrop
```

---

## **SPACING & SIZING HIERARCHY**

### **Component Heights**

```css
/* Buttons */
height: 32px  - Small (sm)
height: 40px  - Default icons
height: 48px  - Standard (md)
height: 56px  - Large (lg)
height: 64px  - Extra Large (xl)

/* Inputs */
height: 40px  - Compact
height: 48px  - Standard
height: 56px  - Large

/* Sidebar Items */
height: 64px  - Navigation buttons
height: 80px  - Logo area

/* Action Bar */
height: 60-80px - Varies by content
```

### **Component Widths**

```css
/* Fixed Widths */
w-20   (80px)  - Navigation sidebar
w-24   (96px)  - Narrow sidebar
w-64   (256px) - Standard sidebar
w-80   (320px) - Wide sidebar
w-96   (384px) - Cart panel (380px custom)

/* Flexible Widths */
w-full         - 100%
w-screen       - 100vw
w-auto         - Auto based on content
max-w-md       - 448px max
max-w-lg       - 512px max
max-w-2xl      - 672px max
max-w-4xl      - 896px max
```

### **Border Radius Scale**

```css
rounded-none   (0px)    - Sharp corners
rounded-sm     (2px)    - Barely rounded
rounded        (4px)    - Subtle
rounded-md     (6px)    - Slight
rounded-lg     (8px)    - Standard card
rounded-xl     (12px)   - Buttons, panels
rounded-2xl    (16px)   - Large cards, navigation items
rounded-3xl    (24px)   - Extra large
rounded-full   (9999px) - Perfect circles
```

**Pattern**:
- **Cards**: `rounded-xl` (12px)
- **Buttons**: `rounded-xl` (12px)
- **Inputs**: `rounded-xl` (12px)
- **Modals**: `rounded-2xl` (16px)
- **Navigation**: `rounded-2xl` (16px)
- **Badges**: `rounded-full` (circular)
- **Avatars**: `rounded-full` (circular)

### **Shadow Scale**

```css
/* Tailwind Shadows */
shadow-sm   - Subtle elevation
shadow      - Standard elevation
shadow-md   - Medium elevation
shadow-lg   - High elevation
shadow-xl   - Very high
shadow-2xl  - Maximum elevation

/* Custom POS Shadows */
shadow-[0px_1px_2px_0px_rgba(0,0,0,0.3),0px_2px_6px_2px_rgba(0,0,0,0.15)]
  - Primary button elevation

shadow-[4px_0_24px_rgba(0,0,0,0.15)]
  - Cart panel shadow
```

**Usage Hierarchy**:
1. **No shadow**: Flat elements, backgrounds
2. **shadow-sm**: Inputs, subtle cards
3. **shadow**: Standard cards
4. **shadow-lg**: Elevated cards, dropdowns
5. **shadow-xl**: Modals, important panels
6. **shadow-2xl**: Navigation, always-visible panels

---

## **Z-INDEX HIERARCHY**

### **Layer Stack** (Bottom to Top)

```css
/* 0-9: Base Content */
z-0 (default)    - Background gradients, base layers
z-10             - Dropdown menus, tooltips

/* 10-39: Overlays */
z-20             - Sticky headers (if used)
z-30             - Floating action buttons

/* 40-59: Navigation */
z-50             - Main navigation sidebar
z-50             - Cart panel
z-50             - Feedback bar

/* 60-69: Sticky Controls */
z-60             - POS Action Bar
z-60             - Sticky footers

/* 70-89: Modals */
z-70             - Modal backdrop
z-75             - Modal content
z-80             - Nested modals (if any)

/* 90-99: System UI */
z-90             - Tooltips over modals
z-[100]          - Toast notifications (if using different system)
```

### **Stacking Context Rules**

1. **Navigation** is always accessible (z-50)
2. **Action Bar** sits above cart (z-60 > z-50)
3. **Modals** block everything below (z-70+)
4. **Feedback** appears over content but under modals (z-50)

### **Interaction Priority**

```
Highest Priority (User must interact before continuing)
    ↓
Modal Dialogs (z-70+)
    ↓
Sticky Controls (z-60) - Action Bar
    ↓
Persistent Navigation (z-50) - Sidebar, Cart, Feedback
    ↓
Floating Elements (z-10-30) - Dropdowns, Tooltips
    ↓
Base Content (z-0)
    ↓
Lowest Priority (Background)
```

---

## **INTERACTIVE STATES HIERARCHY**

### **State Progression** (Least to Most Active)

#### **1. Disabled**
```css
/* Visual Characteristics */
opacity-50
cursor-not-allowed
pointer-events-none (sometimes)

/* Colors */
text-[--on-surface-disabled]
bg-[--surface-variant] or transparent
```

**When to Use**:
- Actions unavailable due to context (empty cart, no permission)
- Form fields that shouldn't be editable

#### **2. Default/Rest**
```css
/* Visual Characteristics */
opacity-100
cursor-default or cursor-pointer

/* Colors */
text-[--on-surface] or text-[--on-surface-variant]
bg-[--surface] or semi-transparent
```

**When to Use**:
- Initial state of all interactive elements

#### **3. Hover**
```css
/* Visual Characteristics */
opacity changes (0.9 or 1.0)
scale(1.03) to scale(1.05)
border color changes (to --primary with opacity)

/* Colors */
bg-[--surface-variant] or increased opacity
border-[--primary]/50
```

**When to Use**:
- Mouse enters interactive element
- Indicates interactivity

#### **4. Focus**
```css
/* Visual Characteristics */
outline or ring
ring-2 ring-[--primary] ring-offset-2

/* Colors */
border-[--primary]
```

**When to Use**:
- Keyboard navigation
- Form field selection
- Accessibility requirement

#### **5. Active/Pressed**
```css
/* Visual Characteristics */
scale(0.95) to scale(0.97)
brightness reduced

/* Colors */
bg-[--primary-dark] or darker variant
```

**When to Use**:
- Mouse down or touch
- Brief moment during click

#### **6. Selected/Active**
```css
/* Visual Characteristics */
Distinct background
Shadow increase
Active indicator (bar, dot, underline)

/* Colors */
bg-gradient (module color)
text-[--on-primary] or contrasting color
```

**When to Use**:
- Currently selected item in list
- Active navigation item
- Chosen tab

### **Motion Hierarchy**

#### **Micro Interactions** (Immediate feedback)
```css
/* Button Press */
whileTap={{ scale: 0.95 }}
duration: instant

/* Hover */
whileHover={{ scale: 1.05 }}
duration: 150ms
```

#### **Transitions** (State changes)
```css
/* Fade */
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
duration: 200-300ms

/* Slide */
initial={{ x: -20 }}
animate={{ x: 0 }}
duration: 300ms
```

#### **Page Transitions** (Major changes)
```css
/* Slide + Fade */
initial={{ opacity: 0, x: 50 }}
animate={{ opacity: 1, x: 0 }}
duration: 400-500ms
```

#### **Entrance Animations** (Elements appearing)
```css
/* Staggered Grid */
transition={{ delay: index * 0.03 }}
duration: 300ms

/* Modal Open */
initial={{ scale: 0.95, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
duration: 200ms
```

---

## **INFORMATION ARCHITECTURE**

### **Screen Structure Hierarchy**

```
Application Root
│
├── Authentication Layer
│   └── Login Screen
│
├── Main Application (Protected)
│   │
│   ├── Global Navigation (Sidebar)
│   │   ├── Dashboard
│   │   ├── POS (Point of Sale)
│   │   ├── Orders
│   │   ├── Customers
│   │   ├── Sales
│   │   ├── Inventory
│   │   ├── B2B
│   │   ├── Reports
│   │   ├── HR
│   │   ├── Cash Management
│   │   ├── Delivery
│   │   ├── Kitchen
│   │   ├── Analytics
│   │   ├── Settings
│   │   ├── Seating
│   │   └── Design System
│   │
│   ├── Screen Content Area
│   │   ├── Page Header
│   │   │   ├── Breadcrumbs
│   │   │   ├── Title
│   │   │   └── Actions
│   │   ├── Filters/Search (optional)
│   │   ├── Main Content
│   │   │   ├── Stats/Summary (if applicable)
│   │   │   └── Primary Data Display
│   │   └── Pagination (if applicable)
│   │
│   └── Contextual UI
│       ├── Modals (conditional)
│       ├── Panels (conditional)
│       ├── Action Bars (screen-specific)
│       └── Feedback (toasts, alerts)
```

### **Data Hierarchy Patterns**

#### **Dashboard Pattern**
```
Summary Stats (4 cards)
    ↓
Primary Chart (Revenue, Sales)
    ↓
Secondary Widgets (Recent activity, notifications)
    ↓
Tertiary Information (Footer, links)
```

#### **List Pattern**
```
Filters & Search
    ↓
Total Count
    ↓
Table Headers (Sortable)
    ↓
Data Rows (Clickable)
    ↓
Pagination
```

#### **Detail Pattern**
```
Item Header (Title, ID, Status)
    ↓
Primary Info (Key details)
    ↓
Tabs/Sections (Related data)
    ↓
Actions (Edit, Delete, etc.)
```

#### **Form Pattern**
```
Form Title
    ↓
Required Fields (*)
    ↓
Optional Fields
    ↓
Advanced/Collapsed Sections
    ↓
Actions (Save, Cancel)
```

---

## **NAVIGATION HIERARCHY**

### **Primary Navigation** (Global - Sidebar)

**Priority Order** (Top to Bottom):
1. **Dashboard** - Overview access
2. **POS** - Primary business function
3. **Orders** - High-frequency monitoring
4. **Customers** - Core CRM
5. **Sales** - Transaction history
6. **Inventory** - Stock management
7. **B2B** - Wholesale operations
8. **Reports** - Analytics access
9. **HR** - Staff management
10. **Cash** - Cash drawer control
11. **Delivery** - Order fulfillment
12. **Kitchen** - Production monitoring
13. **Analytics** - Deep insights
14. **Settings** - System configuration
15. **Seating** - Table management
16. **Design System** - Development tool

**Visual Priority**:
- Active item: Gradient background + active indicator
- Badge items (Orders): Red notification badge
- All items: Hover tooltip with full name

### **Secondary Navigation** (Contextual)

#### **Breadcrumbs**
```
Home > Category > Subcategory > Current Page
```
- Click to navigate up
- Current page is non-interactive

#### **Tabs** (Within screens)
```
Tab 1 (Active) | Tab 2 | Tab 3
```
- Horizontal layout
- Active tab highlighted
- Underline or background indicator

#### **Dropdowns**
```
▼ Select Option
  - Option 1
  - Option 2
  - Option 3
```
- Appears on click/hover
- Closes on selection or blur

### **Tertiary Navigation** (Actions)

#### **Quick Actions** (Floating)
- FAB (Floating Action Button) on some screens
- Quick filters (chips/pills)
- Shortcut buttons

#### **Contextual Menus**
- Right-click menus (if implemented)
- Three-dot menus on list items
- Swipe actions (mobile)

---

## **ANIMATION HIERARCHY**

### **Animation Priority Levels**

#### **Level 1: Critical Feedback** (Immediate, <100ms)
- Button press (scale down)
- Input focus (ring appears)
- Checkbox toggle
- Switch flip

**Properties**: Transform, scale, opacity
**Duration**: 50-100ms
**Easing**: Instant or ease-out

#### **Level 2: State Changes** (Fast, 150-300ms)
- Hover effects
- Color transitions
- Border changes
- Simple fades

**Properties**: Background, border, color, opacity
**Duration**: 150-250ms
**Easing**: Ease-in-out

#### **Level 3: Element Transitions** (Medium, 300-500ms)
- Modal open/close
- Panel slide in/out
- Page transitions
- Card flips

**Properties**: Transform, opacity, position
**Duration**: 300-400ms
**Easing**: Ease-out, spring physics

#### **Level 4: Entrance Animations** (Slow, 500-1000ms)
- Staggered list entrance
- Page load animations
- Complex multi-step animations

**Properties**: Multiple properties
**Duration**: 500-800ms
**Easing**: Stagger, spring, custom curves

### **Animation Patterns**

#### **Fade In**
```tsx
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={{ duration: 0.2 }}
```

#### **Slide Up**
```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3 }}
```

#### **Scale**
```tsx
initial={{ scale: 0.95, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
transition={{ duration: 0.2 }}
```

#### **Spring Slide** (Cart Panel)
```tsx
initial={{ x: '-100%' }}
animate={{ x: 0 }}
exit={{ x: '-100%' }}
transition={{ type: 'spring', damping: 30, stiffness: 300 }}
```

#### **Stagger Children**
```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.03 }}
```

### **Performance Guidelines**

✅ **Animate These** (GPU-accelerated):
- `transform` (translate, scale, rotate)
- `opacity`

❌ **Avoid Animating**:
- `width`, `height` (causes reflow)
- `top`, `left` (use `transform` instead)
- `margin`, `padding`

---

## **ACCESSIBILITY HIERARCHY**

### **Semantic HTML Priority**

1. **Landmarks** (Screen structure)
   - `<nav>` - Navigation sidebar
   - `<main>` - Primary content
   - `<header>` - Page headers
   - `<footer>` - Page footers
   - `<aside>` - Sidebars, panels

2. **Headings** (Content structure)
   - `<h1>` - Page title (one per page)
   - `<h2>` - Section titles
   - `<h3>` - Subsections
   - `<h4>+` - Nested content

3. **Forms** (Input structure)
   - `<form>` - Form container
   - `<label>` - Input labels (connected via `htmlFor`)
   - `<input>`, `<select>`, `<textarea>` - Form controls
   - `<button>` - Actions (type="button" or "submit")

### **Keyboard Navigation Order**

1. **Skip Links** (if implemented)
   - Skip to main content
   - Skip to navigation

2. **Global Navigation**
   - Tab through sidebar items
   - Enter to activate

3. **Page Content**
   - Tab through interactive elements
   - Arrow keys for dropdowns, lists

4. **Modals**
   - Tab trapped within modal
   - ESC to close
   - Return focus on close

### **ARIA Hierarchy**

#### **Roles**
```tsx
role="dialog"        - Modals
role="navigation"    - Nav containers
role="button"        - Non-button clickables
role="listbox"       - Dropdown menus
role="alert"         - Important messages
```

#### **States**
```tsx
aria-expanded        - Dropdowns, accordions
aria-selected        - Selected items
aria-checked         - Checkboxes, radios
aria-disabled        - Disabled state
aria-hidden          - Hidden from screen readers
```

#### **Labels**
```tsx
aria-label           - When no visible label
aria-labelledby      - Reference to label element
aria-describedby     - Additional description
```

### **Focus Management**

**Focus Order**:
1. Primary actions (checkout, save)
2. Secondary actions (cancel, close)
3. Form fields (top to bottom, right to left in RTL)
4. Navigation (sidebar, tabs)
5. Tertiary actions (delete, edit)

**Focus Indicators**:
- Visible outline: `ring-2 ring-[--primary]`
- Skip focus on decorative elements: `tabindex="-1"`
- Manage focus on route change: Focus page heading

---

## **QUICK REFERENCE TABLES**

### **Component Size Matrix**

| Component | Small | Medium | Large |
|-----------|-------|--------|-------|
| Button | 32px | 48px | 56px |
| Input | 40px | 48px | 56px |
| Icon | 16px | 20px | 24px |
| Avatar | 32px | 48px | 64px |
| Card Padding | 12px | 16px | 24px |
| Gap | 8px | 16px | 24px |

### **Color Usage Map**

| Use Case | Light Theme | Dark Theme | Luxury |
|----------|-------------|------------|--------|
| Background | #FFFFFF | #001219 | #1a1a1a |
| Surface | #F9FAFB | #1a1c1e | #2a2a2a |
| Primary Text | #1F2937 | #e2e2e6 | #e2e2e6 |
| Secondary Text | #6B7280 | #c2c7ce | #c2c7ce |
| Border | rgba(0,0,0,0.1) | rgba(255,255,255,0.1) | rgba(255,255,255,0.1) |

### **Typography Quick Reference**

| Element | Size | Weight | Font |
|---------|------|--------|------|
| H1 | 36px | Bold | Almarai |
| H2 | 30px | Bold | Almarai |
| H3 | 24px | Bold | Almarai |
| Body | 16px | Normal | Almarai |
| Small | 14px | Normal | Almarai |
| Caption | 12px | Normal | Almarai |
| Price | 20px | Bold | Arial |

### **Spacing Quick Reference**

| Use Case | Value |
|----------|-------|
| Component gap | 8-16px |
| Section spacing | 24px |
| Screen padding | 16-24px |
| Card padding | 16-24px |
| Button padding | 12-32px horizontal |

---

## **DESIGN PATTERNS LIBRARY**

### **Pattern 1: Master-Detail**
**Used In**: Orders, Customers, Inventory

```
┌────────────────┬─────────────────────┐
│ List           │ Detail              │
│ - Item 1       │ Selected Item Info  │
│ - Item 2 ✓     │ - Header            │
│ - Item 3       │ - Content           │
│                │ - Actions           │
└────────────────┴─────────────────────┘
```

### **Pattern 2: Dashboard Grid**
**Used In**: Dashboard, Analytics

```
┌──────────────────────────────────────┐
│ Stat  Stat  Stat  Stat               │
├──────────────────┬───────────────────┤
│ Main Chart       │ Secondary Widget  │
├──────────────────┴───────────────────┤
│ Table / List                         │
└──────────────────────────────────────┘
```

### **Pattern 3: Wizard/Stepper**
**Used In**: Multi-step forms, onboarding

```
Step 1 ● ─── Step 2 ○ ─── Step 3 ○

┌──────────────────────────────────────┐
│ Current Step Content                 │
└──────────────────────────────────────┘

[Back]  [Next]
```

### **Pattern 4: Kanban Board**
**Used In**: Kitchen, potentially Orders

```
┌────────┬────────┬────────┬────────┐
│ Queue  │ Prep   │ Cooking│ Ready  │
│ ┌────┐ │ ┌────┐ │ ┌────┐ │ ┌────┐ │
│ │Card│ │ │Card│ │ │Card│ │ │Card│ │
│ └────┘ │ └────┘ │ └────┘ │ └────┘ │
└────────┴────────┴────────┴────────┘
```

### **Pattern 5: POS Transaction**
**Used In**: POS Screen

```
┌────────────────────────────────────┐
│ Products Grid                      │
│ [Product] [Product] [Product]      │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ Action Bar (Sticky)                │
└────────────────────────────────────┘
 Cart Panel (Slide-in)
```

---

## **CONCLUSION**

### **Hierarchy Principles Summary**

1. **Visual Weight = Importance**
   - Bigger, brighter, bolder = more important

2. **Proximity = Relationship**
   - Related items are grouped together
   - White space separates unrelated items

3. **Consistency = Predictability**
   - Same patterns across screens
   - Users learn once, apply everywhere

4. **Progressive Disclosure = Simplicity**
   - Show only what's needed now
   - Hide complexity until required

5. **Feedback = Confidence**
   - Every action has a reaction
   - Users always know what's happening

### **Using This Guide**

- **Designers**: Use this to maintain consistency across new designs
- **Developers**: Reference this when implementing features
- **QA**: Verify implementations match these standards
- **Product**: Understand the system's organizational logic


**Last Updated**: December 17, 2025  
**Version**: 1.0  
**Maintained By**: NerdPOS Development Team
