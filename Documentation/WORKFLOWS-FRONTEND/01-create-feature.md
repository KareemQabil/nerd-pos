# Frontend Workflow: Creating a Feature

**Task**: Build a complete frontend feature  
**Time**: 45-60 minutes  
**Stack**: Next.js 14 + TypeScript + Zustand + TanStack Query  

---

## **STEP 1: Plan Component Hierarchy**

```
Feature: Product Management
├── Atoms: ProductBadge, PriceTag
├── Molecules: ProductCard
├── Organisms: ProductGrid, ProductFilters
└── Page: app/products/page.tsx
```

---

## **STEP 2: Create API Client**

```typescript
// lib/api/products.ts
import { apiClient } from './client';

export interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  category: Category;
  isActive: boolean;
}

export const productsAPI = {
  getAll: async (filters?: ProductFilters) => {
    const { data } = await apiClient.get<Product[]>('/products', {
      params: filters
    });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<Product>(`/products/${id}`);
    return data;
  },

  create: async (dto: CreateProductDto) => {
    const { data } = await apiClient.post<Product>('/products', dto);
    return data;
  },

  update: async (id: string, dto: UpdateProductDto) => {
    const { data } = await apiClient.put<Product>(`/products/${id}`, dto);
    return data;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/products/${id}`);
  }
};
```

---

## **STEP 3: Create React Query Hooks**

```typescript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI } from '@/lib/api/products';

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsAPI.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productsAPI.getById(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productsAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

---

## **STEP 4: Create Atoms (Basic Components)**

```tsx
// components/atoms/PriceTag.tsx
import Decimal from 'decimal.js';

interface PriceTagProps {
  price: number;
  className?: string;
}

export function PriceTag({ price, className }: PriceTagProps) {
  const formatted = new Decimal(price).toFixed(2);

  return (
    <span className={`text-lg font-bold text-blue-600 ${className}`}>
      {formatted} SAR
    </span>
  );
}
```

---

## **STEP 5: Create Molecules (Composite Components)**

```tsx
// components/molecules/ProductCard.tsx
import { Product } from '@/lib/api/products';
import { PriceTag } from '@/components/atoms/PriceTag';
import { Badge } from '@/components/atoms/Badge';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const isRTL = useUIStore(state => state.isRTL);

  return (
    <div
      onClick={() => onSelect?.(product)}
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Image */}
      <div className="aspect-square bg-gray-200 rounded-lg mb-3">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="font-semibold text-gray-900 mb-1 truncate">
        {isRTL ? product.nameAr : product.name}
      </h3>

      {/* Category */}
      <Badge className="mb-2">
        {isRTL ? product.category.nameAr : product.category.name}
      </Badge>

      {/* Price */}
      <PriceTag price={product.price} />

      {/* Status */}
      {!product.isActive && (
        <Badge variant="danger" className="ml-2 rtl:mr-2 rtl:ml-0">
          Inactive
        </Badge>
      )}
    </div>
  );
}
```

---

## **STEP 6: Create Organisms (Complex Sections)**

```tsx
// components/organisms/ProductGrid.tsx
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/molecules/ProductCard';
import { Spinner } from '@/components/atoms/Spinner';

interface ProductGridProps {
  categoryId?: string;
  onSelectProduct?: (product: Product) => void;
}

export function ProductGrid({ categoryId, onSelectProduct }: ProductGridProps) {
  const { data: products, isLoading, error } = useProducts({ categoryId });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        Failed to load products
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8">
        No products found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={onSelectProduct}
        />
      ))}
    </div>
  );
}
```

---

## **STEP 7: Create Page**

```tsx
// app/products/page.tsx
'use client';

import { useState } from 'react';
import { ProductGrid } from '@/components/organisms/ProductGrid';
import { CategoryTabs } from '@/components/organisms/CategoryTabs';
import { useCartStore } from '@/lib/stores/cart';

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const addToCart = useCartStore(state => state.addItem);

  const handleSelectProduct = (product: Product) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Products</h1>

      {/* Category filters */}
      <CategoryTabs
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Product grid */}
      <ProductGrid
        categoryId={selectedCategory}
        onSelectProduct={handleSelectProduct}
      />
    </div>
  );
}
```

---

## **STEP 8: Add Client State (if needed)**

```typescript
// lib/stores/products.ts
import create from 'zustand';

interface ProductFiltersStore {
  search: string;
  categoryId?: string;
  isActive?: boolean;
  
  setSearch: (search: string) => void;
  setCategoryId: (categoryId?: string) => void;
  setIsActive: (isActive?: boolean) => void;
  reset: () => void;
}

export const useProductFilters = create<ProductFiltersStore>((set) => ({
  search: '',
  categoryId: undefined,
  isActive: true,

  setSearch: (search) => set({ search }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setIsActive: (isActive) => set({ isActive }),
  reset: () => set({ search: '', categoryId: undefined, isActive: true })
}));
```

---

## **STEP 9: Add Offline Support (Optional)**

```typescript
// In useCreateProduct hook, add offline queue:
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: async (error, variables) => {
      // Queue for offline sync if network error
      if (!navigator.onLine) {
        await offlineQueue.add('createProduct', variables);
        // Optimistically add to cache
        queryClient.setQueryData(['products'], (old: Product[] = []) => [
          ...old,
          { ...variables, id: 'temp-' + Date.now(), isActive: true }
        ]);
      }
    }
  });
}
```

---

## **STEP 10: Testing**

```typescript
// __tests__/ProductGrid.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductGrid } from '@/components/organisms/ProductGrid';

const queryClient = new QueryClient();

describe('ProductGrid', () => {
  it('renders products', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductGrid />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Product 1')).toBeInTheDocument();
  });
});
```

---

## **CHECKLIST**

- [ ] API client created with TypeScript types
- [ ] React Query hooks for server state
- [ ] Atoms (basic UI components)
- [ ] Molecules (composite components)
- [ ] Organisms (complex sections)
- [ ] Page with data fetching
- [ ] Client state (Zustand) if needed
- [ ] Offline support (optional)
- [ ] RTL support
- [ ] Tests written

---

## **COMMON PATTERNS**

**Loading States**:
```tsx
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;
```

**Optimistic Updates**:
```typescript
onMutate: async (newData) => {
  await queryClient.cancelQueries({ queryKey: ['products'] });
  const previous = queryClient.getQueryData(['products']);
  queryClient.setQueryData(['products'], (old) => [...old, newData]);
  return { previous };
},
onError: (err, newData, context) => {
  queryClient.setQueryData(['products'], context.previous);
}
```

---

**NEXT**: [02-components.md](02-components.md)
