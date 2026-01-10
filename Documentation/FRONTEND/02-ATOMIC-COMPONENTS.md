# Atomic Components - Design System

**Pattern**: Atomic Design (Atoms → Molecules → Organisms)  
**Styling**: TailwindCSS + CSS Variables  
**Icons**: Lucide React  

---

## **ATOMS (Smallest Units)**

### **Button**
```tsx
// components/atoms/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent hover:bg-gray-100',
};
```

### **Badge**
```tsx
// components/atoms/Badge.tsx
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
```

### **PriceTag**
```tsx
// components/atoms/PriceTag.tsx
import Decimal from 'decimal.js';

interface PriceTagProps {
  price: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceTag({ price, currency = 'SAR', size = 'md' }: PriceTagProps) {
  const formatted = new Decimal(price).toFixed(2);
  
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <span className={`font-bold text-blue-600 ${sizes[size]}`}>
      {formatted} {currency}
    </span>
  );
}
```

---

## **MOLECULES (Simple Combinations)**

### **Product Card**
```tsx
// components/molecules/ProductCard.tsx
import { Product } from '@/types/api';
import { Badge } from '@/components/atoms/Badge';
import { PriceTag } from '@/components/atoms/PriceTag';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <div
      onClick={() => onSelect?.(product)}
      className="bg-white rounded-lg shadow hover:shadow-md transition cursor-pointer p-4"
    >
      <div className="aspect-square bg-gray-100 rounded-lg mb-3">
        {product.imageUrl && (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
        )}
      </div>
      
      <h3 className="font-semibold truncate mb-2">{product.name}</h3>
      <Badge>{product.category.name}</Badge>
      <PriceTag price={product.price} className="mt-2" />
    </div>
  );
}
```

### **Cart Item**
```tsx
// components/molecules/CartItem.tsx
interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium">{item.name}</h4>
        {item.modifiers && (
          <p className="text-sm text-gray-500">
            {item.modifiers.map(m => m.name).join(', ')}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>-</button>
        <span className="w-8 text-center">{item.quantity}</span>
        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
      </div>
      
      <PriceTag price={item.price * item.quantity} />
      
      <button onClick={() => onRemove(item.id)}>
        <X className="h-5 w-5 text-red-500" />
      </button>
    </div>
  );
}
```

---

## **ORGANISMS (Complex Sections)**

### **Product Grid**
```tsx
// components/organisms/ProductGrid.tsx
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/molecules/ProductCard';

export function ProductGrid({ categoryId, onSelectProduct }) {
  const { data: products, isLoading } = useProducts({ categoryId });

  if (isLoading) return <Spinner />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products?.map(product => (
        <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
      ))}
    </div>
  );
}
```

### **Cart Panel**
```tsx
// components/organisms/CartPanel.tsx
import { useCartStore } from '@/lib/stores/cart';
import { CartItem } from '@/components/molecules/CartItem';
import { Button } from '@/components/atoms/Button';

export function CartPanel({ onCheckout }) {
  const { items, updateQuantity, removeItem, total, clear } = useCartStore();

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Cart</h2>
      
      <div className="flex-1 overflow-y-auto space-y-2">
        {items.map(item => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
          />
        ))}
      </div>
      
      <div className="border-t pt-4 mt-4">
        <div className="flex justify-between text-xl font-bold mb-4">
          <span>Total:</span>
          <PriceTag price={total()} size="lg" />
        </div>
        
        <Button variant="primary" size="lg" onClick={onCheckout} className="w-full">
          Checkout
        </Button>
      </div>
    </div>
  );
}
```

---

## **COMPONENT LIBRARY**

| Component | Type | Purpose |
|-----------|------|---------|
| Button | Atom | Actions |
| Input | Atom | Text entry |
| Badge | Atom | Status/labels |
| PriceTag | Atom | Money display |
| Card | Atom | Container |
| Spinner | Atom | Loading |
| SearchBar | Molecule | Search |
| ProductCard | Molecule | Product display |
| CartItem | Molecule | Cart entry |
| ProductGrid | Organism | Product list |
| CartPanel | Organism | Shopping cart |
| PaymentModal | Organism | Payment UI |

---

**NEXT**: [03-FEATURE-PRODUCTS.md](03-FEATURE-PRODUCTS.md)
