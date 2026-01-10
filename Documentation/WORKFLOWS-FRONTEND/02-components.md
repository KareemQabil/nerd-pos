# Frontend Workflow: Components

**Task**: Build reusable UI components  
**Time**: 10-20 minutes per component  
**Pattern**: Atomic Design  

---

## **ATOMIC DESIGN HIERARCHY**

```
Atoms → Molecules → Organisms → Templates → Pages
```

---

## **ATOMS (Basic Building Blocks)**

### **Button Component**

```tsx
// components/atoms/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-lg font-medium',
          'transition-all duration-200 focus:outline-none focus:ring-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          
          // Variants
          {
            'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500':
              variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400':
              variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500':
              variant === 'danger',
            'bg-transparent hover:bg-gray-100 focus:ring-gray-300':
              variant === 'ghost',
          },
          
          // Sizes
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
          },
          
          className
        )}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-5 w-5 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### **Input Component**

```tsx
// components/atoms/Input.tsx
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'transition-colors duration-200',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

---

## **MOLECULES (Simple Combinations)**

### **Search Bar**

```tsx
// components/molecules/SearchBar.tsx
import { Input } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export function SearchBar({ value, onChange, placeholder, onClear }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
        className="pl-10 pr-10"
      />
      
      {value && (
        <button
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
```

### **Product Card**

```tsx
// components/molecules/ProductCard.tsx
import { Product } from '@/types/api';
import { Badge } from '@/components/atoms/Badge';
import { PriceTag } from '@/components/atoms/PriceTag';
import { useUIStore } from '@/lib/stores/ui';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const isRTL = useUIStore(state => state.isRTL);

  return (
    <div
      onClick={() => onSelect?.(product)}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Image */}
      <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Package className="h-12 w-12" />
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-1 truncate">
          {isRTL ? product.nameAr : product.name}
        </h3>

        <Badge variant="secondary" className="mb-2">
          {isRTL ? product.category.nameAr : product.category.name}
        </Badge>

        <PriceTag price={product.price} />

        {!product.isActive && (
          <Badge variant="danger" className="mt-2">
            {isRTL ? 'غير نشط' : 'Inactive'}
          </Badge>
        )}
      </div>
    </div>
  );
}
```

---

## **ORGANISMS (Complex Sections)**

### **Product Grid with Filters**

```tsx
// components/organisms/ProductGrid.tsx
import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/molecules/ProductCard';
import { SearchBar } from '@/components/molecules/SearchBar';
import { CategoryTabs } from '@/components/molecules/CategoryTabs';
import { Spinner } from '@/components/atoms/Spinner';

interface ProductGridProps {
  onSelectProduct?: (product: Product) => void;
}

export function ProductGrid({ onSelectProduct }: ProductGridProps) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();

  const { data: products, isLoading, error } = useProducts({
    search,
    categoryId
  });

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        Failed to load products
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search products..."
      />

      {/* Category filters */}
      <CategoryTabs
        selectedCategory={categoryId}
        onSelectCategory={setCategoryId}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Spinner size="large" />
        </div>
      )}

      {/* Product grid */}
      {!isLoading && products && (
        <>
          {products.length === 0 ? (
            <div className="text-center text-gray-500 p-8">
              No products found
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={onSelectProduct}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

---

## **RESPONSIVE DESIGN**

```tsx
// Use Tailwind responsive prefixes
<div className="
  grid 
  grid-cols-1        // Mobile: 1 column
  sm:grid-cols-2     // Small: 2 columns
  md:grid-cols-3     // Medium: 3 columns
  lg:grid-cols-4     // Large: 4 columns
  xl:grid-cols-5     // XL: 5 columns
  gap-4
">
```

---

## **RTL SUPPORT**

```tsx
// RTL-aware spacing
<div className="ml-4 rtl:mr-4 rtl:ml-0">

// RTL-aware text alignment
<div className="text-left rtl:text-right">

// RTL-aware direction
<div dir={isRTL ? 'rtl' : 'ltr'}>

// RTL-aware icons
<ChevronRight className="rtl:rotate-180" />
```

---

## **ACCESSIBILITY**

```tsx
// ARIA labels
<button aria-label="Close modal">
  <X />
</button>

// Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>

// Focus visible
<button className="focus:ring-2 focus:ring-blue-500 focus:outline-none">
```

---

## **TESTING**

```typescript
// ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    nameAr: 'منتج تجريبي',
    price: 50,
    category: { name: 'Food', nameAr: 'طعام' },
    isActive: true
  };

  it('renders product name', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<ProductCard product={mockProduct} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Test Product'));
    expect(onSelect).toHaveBeenCalledWith(mockProduct);
  });

  it('shows inactive badge for inactive products', () => {
    render(<ProductCard product={{ ...mockProduct, isActive: false }} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
```

---

## **CHECKLIST**

- [ ] Component follows atomic design level
- [ ] Props properly typed with TypeScript
- [ ] Responsive design (mobile-first)
- [ ] RTL support implemented
- [ ] Accessibility features (ARIA, keyboard)
- [ ] Loading/error states handled
- [ ] Tailwind classes for styling
- [ ] Tests written
- [ ] Storybook story created (optional)

---

**NEXT**: [03-pages.md](03-pages.md)
