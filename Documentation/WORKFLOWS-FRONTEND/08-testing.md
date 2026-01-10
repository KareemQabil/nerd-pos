# Frontend Testing

**Framework**: Jest + Testing Library  
**E2E**: Playwright  
**Coverage**: Components + Hooks  

---

## **COMPONENT TEST**

```tsx
// __tests__/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '@/components/molecules/ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 100,
    category: { id: 'cat-1', name: 'Food' },
  };

  it('renders product information', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('100 SAR')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<ProductCard product={mockProduct} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Test Product'));
    
    expect(onSelect).toHaveBeenCalledWith(mockProduct);
  });
});
```

---

## **HOOK TEST**

```tsx
// __tests__/useCart.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '@/lib/stores/cart';

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it('adds item to cart', () => {
    const { result } = renderHook(() => useCartStore());
    
    act(() => {
      result.current.addItem({
        id: '1',
        name: 'Product',
        price: 50,
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.total()).toBe(50);
  });

  it('calculates tax correctly', () => {
    const { result } = renderHook(() => useCartStore());
    
    act(() => {
      result.current.addItem({ id: '1', name: 'Product', price: 100 });
    });

    expect(result.current.tax()).toBe(15); // 15% VAT
  });
});
```

---

## **PLAYWRIGHT E2E**

```typescript
// e2e/products.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Products Page', () => {
  test('displays product list', async ({ page }) => {
    await page.goto('/products');
    
    await expect(page.locator('h1')).toContainText('Products');
    
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards).toHaveCount(12);
  });

  test('creates new product', async ({ page }) => {
    await page.goto('/products/new');
    
    await page.fill('[name="name"]', 'New Product');
    await page.fill('[name="price"]', '75');
    await page.selectOption('[name="categoryId"]', 'cat-1');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/products');
    await expect(page.locator('text=New Product')).toBeVisible();
  });
});
```

---

**Frontend Workflows Complete ✅**
