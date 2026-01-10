# Products Feature - Frontend

**Module**: Product Management UI  
**Components**: Product grid, filters, CRUD forms  
**State**: TanStack Query + Zustand  

---

## **PAGE STRUCTURE**

```tsx
// app/products/page.tsx
'use client';

import { useState } from 'react';
import { ProductGrid } from '@/components/organisms/ProductGrid';
import { ProductFilters } from '@/components/organisms/ProductFilters';
import { Button } from '@/components/atoms/Button';
import { useProducts } from '@/hooks/useProducts';

export default function ProductsPage() {
  const [filters, setFilters] = useState({ categoryId: undefined, search: '' });
  const { data: products, isLoading } = useProducts(filters);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <Button href="/products/new">Add Product</Button>
      </div>

      <ProductFilters filters={filters} onChange={setFilters} />
      <ProductGrid products={products} isLoading={isLoading} />
    </div>
  );
}
```

---

## **API HOOK**

```typescript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI } from '@/lib/api/products';

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsAPI.getAll(filters),
    staleTime: 5 * 60 * 1000,
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
```

---

**More features in full docs...**
