# Frontend Principles - NerdPOS

**Purpose**: Core principles and patterns for frontend development  
**Stack**: Next.js 14+ + TypeScript + Zustand + TanStack Query  
**Design**: Atomic Design + Glassmorphism + RTL Support

---

## **CORE PRINCIPLES**

### **1. Atomic Design**

```
Components hierarchy:
Atoms       → Button, Input, Badge, Icon (smallest units)
Molecules   → ProductCard, CartItem, PaymentButton (simple combinations)
Organisms   → ProductGrid, CartPanel, PaymentModal (complex combinations)
Templates   → POSLayout, DashboardLayout (page structures)
Pages       → /pos, /dashboard, /settings (full pages)
```

### **2. Server/Client State Separation**

```typescript
// ✅ Server State (API data) - Use TanStack Query
const { data: products } = useQuery({
  queryKey: ['products'],
  queryFn: () => api.products.getAll()
});

// ✅ Client State (UI state) - Use Zustand
const cart = useCartStore(state => state.items);
const addToCart = useCartStore(state => state.addItem);
```

### **3. Offline-First**

```typescript
// Store mutations in IndexedDB when offline
if (!navigator.onLine) {
  await offlineQueue.add('createOrder', orderData);
} else {
  await api.orders.create(orderData);
}

// Auto-sync when online
window.addEventListener('online', () => {
  offlineQueue.sync();
});
```

### **4. RTL Support**

```tsx
// Always use dir attribute
<div className="text-right rtl:text-left" dir={isRTL ? 'rtl' : 'ltr'}>
  {isRTL ? product.nameAr : product.name}
</div>

// Tailwind RTL utilities
<div className="ml-4 rtl:mr-4 rtl:ml-0">
```

---

## **PROJECT STRUCTURE**

```
nerdpos-frontend/
├── app/                          ← Next.js 14 App Router
│   ├── layout.tsx                ← Root layout
│   ├── globals.css               ← Global styles
│   │
│   ├── pos/                      ← POS screens
│   │   ├── page.tsx              ← Main POS screen
│   │   ├── quick-sale/
│   │   ├── dine-in/
│   │   └── delivery/
│   │
│   ├── dashboard/                ← Admin dashboard
│   ├── settings/                 ← Configuration
│   ├── kitchen/                  ← Kitchen Display
│   └── api/                      ← API routes (if needed)
│
├── components/
│   ├── atoms/                    ← Basic UI elements
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   └── Icon.tsx
│   │
│   ├── molecules/                ← Simple combinations
│   │   ├── ProductCard.tsx
│   │   ├── CartItem.tsx
│   │   └── PaymentMethodButton.tsx
│   │
│   ├── organisms/                ← Complex sections
│   │   ├── ProductGrid.tsx
│   │   ├── CartPanel.tsx
│   │   ├── PaymentModal.tsx
│   │   └── CategoryTabs.tsx
│   │
│   └── templates/                ← Page layouts
│       ├── POSLayout.tsx
│       └── DashboardLayout.tsx
│
├── lib/
│   ├── api/                      ← API client
│   │   ├── client.ts             ← Axios instance
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   └── payments.ts
│   │
│   ├── stores/                   ← Zustand stores
│   │   ├── cart.ts
│   │   ├── session.ts
│   │   └── ui.ts
│   │
│   ├── offline/                  ← Offline sync
│   │   ├── queue.ts
│   │   └── db.ts (IndexedDB)
│   │
│   └── utils/
│       ├── decimal.ts            ← Decimal.js helpers
│       ├── format.ts
│       └── validators.ts
│
├── hooks/
│   ├── useProducts.ts            ← React Query hooks
│   ├── useOrders.ts
│   ├── useCart.ts                ← Zustand hooks
│   └── useOffline.ts
│
├── types/
│   ├── api.ts                    ← API types
│   ├── models.ts                 ← Domain models
│   └── ui.ts                     ← UI types
│
├── styles/
│   └── themes/
│       ├── light.css
│       ├── dark.css
│       └── luxury.css
│
└── public/
    ├── icons/
    └── images/
```

---

## **STATE MANAGEMENT**

### **Server State (TanStack Query)**

```typescript
// hooks/useProducts.ts
import { useQuery, useMutation } from '@tanstack/react-query';

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => api.products.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderDto) => api.orders.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
    },
    onError: async (error, variables) => {
      // Queue for offline sync
      if (!navigator.onLine) {
        await offlineQueue.add('createOrder', variables);
      }
    }
  });
}
```

### **Client State (Zustand)**

```typescript
// stores/cart.ts
import create from 'zustand';
import { persist } from 'zustand/middleware';
import Decimal from 'decimal.js';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: Modifier[];
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => set((state) => {
        const existing = state.items.find(i => i.productId === item.productId);
        if (existing) {
          return {
            items: state.items.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          };
        }
        return { items: [...state.items, item] };
      }),

      removeItem: (productId) => set((state) => ({
        items: state.items.filter(i => i.productId !== productId)
      })),

      updateQuantity: (productId, quantity) => set((state) => ({
        items: state.items.map(i =>
          i.productId === productId ? { ...i, quantity } : i
        )
      })),

      clear: () => set({ items: [] }),

      total: () => {
        const items = get().items;
        return items.reduce((sum, item) => {
          const itemTotal = new Decimal(item.price).times(item.quantity);
          return sum.plus(itemTotal);
        }, new Decimal(0)).toNumber();
      }
    }),
    {
      name: 'cart-storage',
    }
  )
);
```

---

## **OFFLINE SYNC**

```typescript
// lib/offline/queue.ts
import { openDB, DBSchema } from 'idb';

interface OfflineDB extends DBSchema {
  mutations: {
    key: string;
    value: {
      id: string;
      type: string;
      data: any;
      timestamp: number;
      status: 'pending' | 'synced' | 'failed';
    };
  };
}

class OfflineQueue {
  private db: IDBDatabase;

  async init() {
    this.db = await openDB<OfflineDB>('nerdpos-offline', 1, {
      upgrade(db) {
        db.createObjectStore('mutations', { keyPath: 'id' });
      }
    });
  }

  async add(type: string, data: any) {
    await this.db.put('mutations', {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
      status: 'pending'
    });
  }

  async sync() {
    if (!navigator.onLine) return;

    const pending = await this.db.getAllFromIndex('mutations', 'status', 'pending');

    for (const mutation of pending) {
      try {
        // Execute mutation
        await this.executeMutation(mutation);

        // Mark as synced
        await this.db.put('mutations', {
          ...mutation,
          status: 'synced'
        });
      } catch (error) {
        await this.db.put('mutations', {
          ...mutation,
          status: 'failed'
        });
      }
    }
  }

  private async executeMutation(mutation: any) {
    switch (mutation.type) {
      case 'createOrder':
        return api.orders.create(mutation.data);
      case 'createPayment':
        return api.payments.create(mutation.data);
      // Add more mutation types
    }
  }
}

export const offlineQueue = new OfflineQueue();
```

---

## **THEMING**

```typescript
// stores/ui.ts
type Theme = 'light' | 'dark' | 'luxury';

interface UIStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isRTL: boolean;
  toggleRTL: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'light',
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
  },

  isRTL: false,
  toggleRTL: () => set((state) => {
    const isRTL = !state.isRTL;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    return { isRTL };
  })
}));
```

---

## **KEY FEATURES**

1. **Atomic Design** - Scalable component hierarchy
2. **Server/Client Split** - TanStack Query + Zustand
3. **Offline-First** - IndexedDB queue with auto-sync
4. **RTL Support** - Full Arabic support
5. **Theme System** - 3 themes with CSS variables
6. **Type-Safe** - Full TypeScript coverage

---

## **NEXT**

- [01-PROJECT-STRUCTURE.md](01-PROJECT-STRUCTURE.md) - Detailed folder structure
- [02-ATOMIC-COMPONENTS.md](02-ATOMIC-COMPONENTS.md) - Component patterns
