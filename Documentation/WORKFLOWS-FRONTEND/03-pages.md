# Create Next.js Page

**Framework**: Next.js 14 App Router  
**Pattern**: Server Components + Client Components  
**Data**: Server-side fetching + TanStack Query  

---

## **SERVER COMPONENT (Page)**

```tsx
// app/products/page.tsx
import { Suspense } from 'react';
import { ProductsGrid } from '@/components/organisms/ProductsGrid';
import { ProductsFilters } from '@/components/organisms/ProductsFilters';
import { Skeleton } from '@/components/atoms/Skeleton';

export const metadata = {
  title: 'Products - NerdPOS',
  description: 'Manage your products',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string; search?: string };
}) {
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/products/new">
          <Button>Add Product</Button>
        </Link>
      </div>

      <Suspense fallback={<Skeleton />}>
        <ProductsFilters />
        <ProductsGrid 
          categoryId={searchParams.category} 
          search={searchParams.search} 
        />
      </Suspense>
    </div>
  );
}
```

---

## **CLIENT COMPONENT (Interactive)**

```tsx
// components/organisms/ProductsGrid.tsx
'use client';

import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/molecules/ProductCard';
import { Spinner } from '@/components/atoms/Spinner';

interface Props {
  categoryId?: string;
  search?: string;
}

export function ProductsGrid({ categoryId, search }: Props) {
  const { data: products, isLoading } = useProducts({ categoryId, search });

  if (isLoading) return <Spinner />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

## **DYNAMIC ROUTE**

```tsx
// app/products/[id]/page.tsx
import { notFound } from 'next/navigation';
import { productsAPI } from '@/lib/api/products';
import { ProductDetail } from '@/components/organisms/ProductDetail';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const product = await productsAPI.getById(params.id);
  
  return {
    title: `${product.name} - NerdPOS`,
  };
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await productsAPI.getById(params.id);

  if (!product) {
    notFound();
  }

  return <ProductDetail product={product} />;
}
```

---

## **LAYOUT**

```tsx
// app/products/layout.tsx
import { Sidebar } from '@/components/organisms/Sidebar';

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
```

---

## **LOADING STATE**

```tsx
// app/products/loading.tsx
export default function Loading() {
  return (
    <div className="grid grid-cols-4 gap-4 p-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
```

---

## **ERROR BOUNDARY**

```tsx
// app/products/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

**NEXT**: [04-api-clients.md](04-api-clients.md)
