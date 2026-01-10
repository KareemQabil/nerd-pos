# API Client Setup

**Library**: Axios  
**State**: TanStack Query  
**Auth**: JWT Bearer Token  

---

## **AXIOS INSTANCE**

```typescript
// lib/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (handle errors)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    
    if (error.response?.status === 403) {
      toast.error('You do not have permission');
    }
    
    return Promise.reject(error);
  }
);
```

---

## **API MODULE**

```typescript
// lib/api/products.ts
import { apiClient } from './client';
import { Product, CreateProductDto, UpdateProductDto } from '@/types/api';

export const productsAPI = {
  getAll: async (filters?: { categoryId?: string; search?: string }) => {
    const { data } = await apiClient.get<Product[]>('/products', { params: filters });
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
    const { data } = await apiClient.patch<Product>(`/products/${id}`, dto);
    return data;
  },

  delete: async (id: string) => {
    await apiClient.delete(`/products/${id}`);
  },

  search: async (query: string) => {
    const { data } = await apiClient.get<Product[]>('/products/search', {
      params: { q: query },
    });
    return data;
  },
};
```

---

## **TANSTACK QUERY HOOK**

```typescript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI } from '@/lib/api/products';

export function useProducts(filters?: { categoryId?: string; search?: string }) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsAPI.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
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
      toast.success('Product created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create product');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productsAPI.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      toast.success('Product updated');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
  });
}
```

---

## **USAGE IN COMPONENT**

```tsx
// components/ProductList.tsx
'use client';

import { useProducts, useDeleteProduct } from '@/hooks/useProducts';

export function ProductList() {
  const { data: products, isLoading, error } = useProducts();
  const { mutate: deleteProduct } = useDeleteProduct();

  if (isLoading) return <Spinner />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {products?.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <button onClick={() => deleteProduct(product.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

---

## **QUERY CLIENT SETUP**

```tsx
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

**NEXT**: [05-state-management.md](05-state-management.md)
