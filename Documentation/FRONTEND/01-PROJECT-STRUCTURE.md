# Frontend Project Structure

**Framework**: Next.js 14 with App Router  
**Language**: TypeScript  
**Styling**: TailwindCSS + CSS Variables  

---

## **COMPLETE FOLDER STRUCTURE**

```
nerdpos-frontend/
├── app/                          ← Next.js 14 App Router
│   ├── (auth)/                   ← Auth routes group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/              ← Protected routes
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── new/
│   │   │       └── page.tsx
│   │   ├── inventory/
│   │   ├── customers/
│   │   ├── reports/
│   │   └── settings/
│   │
│   ├── pos/                      ← POS screens
│   │   ├── page.tsx              ← Main POS
│   │   ├── quick-sale/
│   │   ├── dine-in/
│   │   └── delivery/
│   │
│   ├── kitchen/                  ← KDS
│   │   └── page.tsx
│   │
│   ├── layout.tsx                ← Root layout
│   ├── globals.css
│   ├── providers.tsx
│   └── error.tsx
│
├── components/
│   ├── atoms/                    ← Basic UI
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Spinner.tsx
│   │   ├── Icon.tsx
│   │   └── PriceTag.tsx
│   │
│   ├── molecules/                ← Combos
│   │   ├── SearchBar.tsx
│   │   ├── ProductCard.tsx
│   │   ├── CartItem.tsx
│   │   ├── CategoryTab.tsx
│   │   ├── PaymentMethodButton.tsx
│   │   └── ModifierGroup.tsx
│   │
│   ├── organisms/                ← Complex
│   │   ├── ProductGrid.tsx
│   │   ├── CartPanel.tsx
│   │   ├── PaymentModal.tsx
│   │   ├── ModifierModal.tsx
│   │   ├── CategoryTabs.tsx
│   │   ├── OrderList.tsx
│   │   └── KitchenTicket.tsx
│   │
│   └── templates/
│       ├── POSLayout.tsx
│       ├── DashboardLayout.tsx
│       └── KitchenLayout.tsx
│
├── lib/
│   ├── api/                      ← API clients
│   │   ├── client.ts             ← Axios base
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── payments.ts
│   │   ├── customers.ts
│   │   └── inventory.ts
│   │
│   ├── stores/                   ← Zustand
│   │   ├── cart.ts
│   │   ├── session.ts
│   │   ├── ui.ts
│   │   └── order.ts
│   │
│   ├── offline/                  ← PWA
│   │   ├── queue.ts
│   │   ├── db.ts                 ← IndexedDB
│   │   └── sync.ts
│   │
│   └── utils/
│       ├── decimal.ts
│       ├── format.ts
│       ├── validators.ts
│       └── cn.ts
│
├── hooks/
│   ├── useProducts.ts
│   ├── useOrders.ts
│   ├── useCart.ts
│   ├── usePayments.ts
│   ├── useOffline.ts
│   └── useRTL.ts
│
├── types/
│   ├── api.ts
│   ├── models.ts
│   └── ui.ts
│
├── styles/
│   └── themes/
│       ├── light.css
│       ├── dark.css
│       └── luxury.css
│
└── public/
    ├── sw.js                     ← Service Worker
    ├── manifest.json             ← PWA
    ├── icons/
    └── sounds/
        ├── new-order.mp3
        └── payment-success.mp3
```

---

## **KEY FILES EXPLAINED**

### **app/layout.tsx** (Root)
```tsx
import { Providers } from './providers';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### **app/providers.tsx**
```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### **lib/api/client.ts**
```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## **ROUTING PATTERNS**

### **Parallel Routes**
```
app/
├── @modal/
│   └── (.)products/
│       └── [id]/
│           └── page.tsx      ← Modal overlay
└── products/
    └── [id]/
        └── page.tsx          ← Full page
```

### **Intercepting Routes**
```tsx
// Quick product preview without navigation
// app/@modal/(.)products/[id]/page.tsx
export default function ProductModal({ params }) {
  return (
    <Modal>
      <ProductDetail id={params.id} />
    </Modal>
  );
}
```

### **Route Groups**
```
(auth)/     ← No auth required
(dashboard)/ ← Requires auth
pos/        ← Special layout
```

---

## **NEXT STEPS**

1. Install dependencies: `npm install`
2. Configure environment: `.env.local`
3. Run dev server: `npm run dev`
4. Build for production: `npm run build`

---

**NEXT**: [02-ATOMIC-COMPONENTS.md](02-ATOMIC-COMPONENTS.md)
