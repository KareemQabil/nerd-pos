import { create } from 'zustand';

export type PosMode = 'QUICK_SALE' | 'DINE_IN' | 'DELIVERY';

export type CartItemDraft = {
  productId: string;
  qty: number;
  notes?: string;
  modifiers?: string[];
};

type PosCartState = {
  mode: PosMode;
  items: CartItemDraft[];
  setMode: (mode: PosMode) => void;
  setItems: (items: CartItemDraft[]) => void;
  clear: () => void;
};

export const usePosCartStore = create<PosCartState>((set) => ({
  mode: 'QUICK_SALE',
  items: [],
  setMode: (mode) => set({ mode }),
  setItems: (items) => set({ items }),
  clear: () => set({ items: [] }),
}));
