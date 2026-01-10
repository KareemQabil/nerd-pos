# State Management with Zustand

**Library**: Zustand  
**Persistence**: localStorage  
**Pattern**: Multiple stores by feature  

---

## **CART STORE**

```typescript
// lib/stores/cart.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Decimal from 'decimal.js';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: Modifier[];
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, modifiers?: Modifier[]) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  subtotal: () => number;
  tax: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, modifiers = []) => {
        const itemId = `${product.id}-${modifiers.map(m => m.id).join('-')}`;
        const existingItem = get().items.find(i => i.id === itemId);

        if (existingItem) {
          set({
            items: get().items.map(item =>
              item.id === itemId
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          const modifierPrice = modifiers.reduce(
            (sum, m) => sum + m.price,
            0
          );

          set({
            items: [
              ...get().items,
              {
                id: itemId,
                productId: product.id,
                name: product.name,
                price: product.price + modifierPrice,
                quantity: 1,
                modifiers,
              },
            ],
          });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter(item => item.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
        } else {
          set({
            items: get().items.map(item =>
              item.id === id ? { ...item, quantity } : item
            ),
          });
        }
      },

      clear: () => set({ items: [] }),

      subtotal: () => {
        return get().items.reduce((sum, item) => {
          const itemTotal = new Decimal(item.price).times(item.quantity);
          return sum + itemTotal.toNumber();
        }, 0);
      },

      tax: () => {
        const subtotal = new Decimal(get().subtotal());
        return subtotal.times(0.15).toNumber(); // 15% VAT
      },

      total: () => {
        return get().subtotal() + get().tax();
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
```

---

## **UI STORE**

```typescript
// lib/stores/ui.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  theme: 'light' | 'dark' | 'luxury';
  language: 'en' | 'ar';
  sidebarOpen: boolean;
  setTheme: (theme: 'light' | 'dark' | 'luxury') => void;
  setLanguage: (language: 'en' | 'ar') => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      sidebarOpen: true,

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },

      setLanguage: (language) => {
        set({ language });
        document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'ui-storage',
    }
  )
);
```

---

## **SESSION STORE**

```typescript
// lib/stores/session.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Session {
  id: string;
  sessionNumber: string;
  openingBalance: number;
  openedAt: Date;
  cashierId: string;
}

interface SessionStore {
  currentSession: Session | null;
  startSession: (session: Session) => void;
  endSession: () => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      currentSession: null,

      startSession: (session) => set({ currentSession: session }),

      endSession: () => set({ currentSession: null }),
    }),
    {
      name: 'session-storage',
    }
  )
);
```

---

## **ORDER STORE**

```typescript
// lib/stores/order.ts
import { create } from 'zustand';

interface OrderStore {
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableId?: string;
  customerId?: string;
  deliveryAddress?: string;
  
  setOrderType: (type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY') => void;
  setTable: (tableId: string) => void;
  setCustomer: (customerId: string) => void;
  setDeliveryAddress: (address: string) => void;
  reset: () => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  orderType: 'TAKEAWAY',
  tableId: undefined,
  customerId: undefined,
  deliveryAddress: undefined,

  setOrderType: (type) => set({ orderType: type }),
  setTable: (tableId) => set({ tableId }),
  setCustomer: (customerId) => set({ customerId }),
  setDeliveryAddress: (address) => set({ deliveryAddress: address }),
  reset: () => set({
    orderType: 'TAKEAWAY',
    tableId: undefined,
    customerId: undefined,
    deliveryAddress: undefined,
  }),
}));
```

---

## **USAGE**

```tsx
// components/CartPanel.tsx
'use client';

import { useCartStore } from '@/lib/stores/cart';
import { PriceTag } from '@/components/atoms/PriceTag';

export function CartPanel() {
  const { items, removeItem, updateQuantity, total, clear } = useCartStore();

  return (
    <div className="glass-card">
      <h2>Cart ({items.length})</h2>
      
      {items.map(item => (
        <div key={item.id}>
          <span>{item.name}</span>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
          />
          <button onClick={() => removeItem(item.id)}>×</button>
        </div>
      ))}

      <div className="border-t pt-4">
        <PriceTag price={total()} size="lg" />
        <button onClick={clear}>Clear Cart</button>
      </div>
    </div>
  );
}
```

---

**NEXT**: [06-forms.md](06-forms.md)
