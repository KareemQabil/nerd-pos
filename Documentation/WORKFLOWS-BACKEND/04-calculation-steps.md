# Backend Workflow: Calculation Steps

**Task**: Implement calculation pipeline for orders/invoices  
**Time**: 20-30 minutes  
**Pattern**: Pipeline Pattern + Decimal.js  

---

## **7-STEP CALCULATION PIPELINE**

```
1. Calculate Item Base Price
2. Apply Item Modifiers
3. Apply Item Discounts
4. Calculate Item Subtotal
5. Calculate Item Tax
6. Apply Order-Level Discounts
7. Calculate Grand Total
```

---

## **STEP 1: Item Base Price**

```typescript
// Calculate base price for quantity
function calculateBasePrice(
  price: number,
  quantity: number
): Decimal {
  const priceDecimal = new Decimal(price);
  const quantityDecimal = new Decimal(quantity);
  
  return priceDecimal.times(quantityDecimal);
}

// Example
const basePrice = calculateBasePrice(50.00, 2);
// Result: 100.00
```

---

## **STEP 2: Apply Modifiers**

```typescript
// Add modifier prices to base
function applyModifiers(
  basePrice: Decimal,
  modifiers: Modifier[],
  quantity: number
): Decimal {
  let total = basePrice;

  for (const modifier of modifiers) {
    const modifierPrice = new Decimal(modifier.price);
    const modifierTotal = modifierPrice.times(quantity);
    total = total.plus(modifierTotal);
  }

  return total;
}

// Example
const modifiers = [
  { id: '1', name: 'Extra Cheese', price: 5.00 },
  { id: '2', name: 'Bacon', price: 8.00 }
];

const withModifiers = applyModifiers(
  new Decimal(100.00), // base
  modifiers,
  2 // quantity
);
// Result: 100.00 + (5.00 * 2) + (8.00 * 2) = 126.00
```

---

## **STEP 3: Item Discounts**

```typescript
// Apply discount to item
function applyItemDiscount(
  itemTotal: Decimal,
  discount: Discount
): { finalPrice: Decimal; discountAmount: Decimal } {
  let discountAmount = new Decimal(0);

  if (discount.type === 'PERCENTAGE') {
    const percentage = new Decimal(discount.value).dividedBy(100);
    discountAmount = itemTotal.times(percentage);
  } else if (discount.type === 'FIXED') {
    discountAmount = new Decimal(discount.value);
  }

  const finalPrice = itemTotal.minus(discountAmount);

  return {
    finalPrice: finalPrice.lessThan(0) ? new Decimal(0) : finalPrice,
    discountAmount
  };
}

// Example
const { finalPrice, discountAmount } = applyItemDiscount(
  new Decimal(126.00),
  { type: 'PERCENTAGE', value: 10 } // 10% off
);
// finalPrice: 113.40
// discountAmount: 12.60
```

---

## **STEP 4: Item Subtotal**

```typescript
// Sum all items
function calculateItemsSubtotal(items: OrderItem[]): Decimal {
  return items.reduce((sum, item) => {
    const itemTotal = new Decimal(item.priceAfterDiscount).times(item.quantity);
    return sum.plus(itemTotal);
  }, new Decimal(0));
}

// Example
const items = [
  { priceAfterDiscount: 113.40, quantity: 1 },
  { priceAfterDiscount: 50.00, quantity: 2 }
];

const subtotal = calculateItemsSubtotal(items);
// Result: 113.40 + (50.00 * 2) = 213.40
```

---

## **STEP 5: Calculate Tax**

```typescript
// Apply tax rate to taxable amount
function calculateTax(
  taxableAmount: Decimal,
  taxRate: number
): Decimal {
  const rate = new Decimal(taxRate).dividedBy(100);
  return taxableAmount.times(rate);
}

// Calculate tax per item
function calculateItemTax(
  priceAfterDiscount: Decimal,
  quantity: number,
  taxRate: number
): Decimal {
  const itemTotal = priceAfterDiscount.times(quantity);
  return calculateTax(itemTotal, taxRate);
}

// Example (15% VAT)
const tax = calculateItemTax(
  new Decimal(113.40),
  1,
  15
);
// Result: 17.01
```

---

## **STEP 6: Order-Level Discounts**

```typescript
// Apply discount to entire order
function applyOrderDiscount(
  subtotal: Decimal,
  discount: Discount
): { finalSubtotal: Decimal; discountAmount: Decimal } {
  let discountAmount = new Decimal(0);

  if (discount.type === 'PERCENTAGE') {
    const percentage = new Decimal(discount.value).dividedBy(100);
    discountAmount = subtotal.times(percentage);
  } else if (discount.type === 'FIXED') {
    discountAmount = new Decimal(discount.value);
    
    // Discount cannot exceed subtotal
    if (discountAmount.greaterThan(subtotal)) {
      discountAmount = subtotal;
    }
  }

  const finalSubtotal = subtotal.minus(discountAmount);

  return { finalSubtotal, discountAmount };
}

// Example
const { finalSubtotal, discountAmount } = applyOrderDiscount(
  new Decimal(213.40),
  { type: 'FIXED', value: 20.00 } // 20 SAR off
);
// finalSubtotal: 193.40
// discountAmount: 20.00
```

---

## **STEP 7: Grand Total**

```typescript
// Final calculation
function calculateGrandTotal(
  subtotal: Decimal,
  totalTax: Decimal,
  serviceFee?: Decimal,
  deliveryFee?: Decimal
): Decimal {
  let total = subtotal.plus(totalTax);

  if (serviceFee) {
    total = total.plus(serviceFee);
  }

  if (deliveryFee) {
    total = total.plus(deliveryFee);
  }

  return total;
}

// Example
const grandTotal = calculateGrandTotal(
  new Decimal(193.40), // subtotal after discount
  new Decimal(29.01),  // total tax
  new Decimal(10.00),  // service fee (optional)
  new Decimal(15.00)   // delivery fee (optional)
);
// Result: 193.40 + 29.01 + 10.00 + 15.00 = 247.41
```

---

## **COMPLETE ORDER CALCULATION**

```typescript
// services/order-calculation.service.ts
import Decimal from 'decimal.js';

@Injectable()
export class OrderCalculationService {
  calculateOrder(dto: CalculateOrderDto): OrderCalculation {
    const items: CalculatedItem[] = [];
    let subtotal = new Decimal(0);
    let totalTax = new Decimal(0);
    let totalDiscount = new Decimal(0);

    // Step 1-5: Process each item
    for (const item of dto.items) {
      // 1. Base price
      const basePrice = new Decimal(item.product.price)
        .times(item.quantity);

      // 2. Add modifiers
      const withModifiers = this.applyModifiers(
        basePrice,
        item.modifiers,
        item.quantity
      );

      // 3. Apply item discount
      const { finalPrice, discountAmount } = this.applyItemDiscount(
        withModifiers,
        item.discount
      );

      // 4. Item subtotal
      const itemSubtotal = finalPrice;

      // 5. Calculate tax
      const itemTax = this.calculateTax(
        itemSubtotal,
        item.product.taxRate || 15
      );

      // Store calculated item
      items.push({
        productId: item.product.id,
        quantity: item.quantity,
        basePrice: basePrice.toNumber(),
        priceWithModifiers: withModifiers.toNumber(),
        priceAfterDiscount: finalPrice.toNumber(),
        discountAmount: discountAmount.toNumber(),
        taxAmount: itemTax.toNumber(),
        total: finalPrice.plus(itemTax).toNumber()
      });

      subtotal = subtotal.plus(itemSubtotal);
      totalTax = totalTax.plus(itemTax);
      totalDiscount = totalDiscount.plus(discountAmount);
    }

    // 6. Apply order-level discount
    let orderDiscountAmount = new Decimal(0);
    if (dto.orderDiscount) {
      const result = this.applyOrderDiscount(subtotal, dto.orderDiscount);
      subtotal = result.finalSubtotal;
      orderDiscountAmount = result.discountAmount;
      totalDiscount = totalDiscount.plus(orderDiscountAmount);
      
      // Recalculate tax after order discount
      totalTax = this.calculateTax(subtotal, 15);
    }

    // 7. Grand total
    const grandTotal = this.calculateGrandTotal(
      subtotal,
      totalTax,
      dto.serviceFee ? new Decimal(dto.serviceFee) : undefined,
      dto.deliveryFee ? new Decimal(dto.deliveryFee) : undefined
    );

    return {
      items,
      subtotal: subtotal.toNumber(),
      totalDiscount: totalDiscount.toNumber(),
      totalTax: totalTax.toNumber(),
      serviceFee: dto.serviceFee || 0,
      deliveryFee: dto.deliveryFee || 0,
      grandTotal: grandTotal.toNumber()
    };
  }

  private applyModifiers(basePrice: Decimal, modifiers: Modifier[], quantity: number): Decimal {
    let total = basePrice;
    for (const modifier of modifiers || []) {
      const modifierPrice = new Decimal(modifier.price).times(quantity);
      total = total.plus(modifierPrice);
    }
    return total;
  }

  private applyItemDiscount(
    itemTotal: Decimal,
    discount?: Discount
  ): { finalPrice: Decimal; discountAmount: Decimal } {
    if (!discount) {
      return { finalPrice: itemTotal, discountAmount: new Decimal(0) };
    }

    let discountAmount = new Decimal(0);

    if (discount.type === 'PERCENTAGE') {
      const percentage = new Decimal(discount.value).dividedBy(100);
      discountAmount = itemTotal.times(percentage);
    } else if (discount.type === 'FIXED') {
      discountAmount = new Decimal(discount.value);
    }

    const finalPrice = itemTotal.minus(discountAmount);

    return {
      finalPrice: finalPrice.lessThan(0) ? new Decimal(0) : finalPrice,
      discountAmount
    };
  }

  private applyOrderDiscount(
    subtotal: Decimal,
    discount: Discount
  ): { finalSubtotal: Decimal; discountAmount: Decimal } {
    let discountAmount = new Decimal(0);

    if (discount.type === 'PERCENTAGE') {
      const percentage = new Decimal(discount.value).dividedBy(100);
      discountAmount = subtotal.times(percentage);
    } else if (discount.type === 'FIXED') {
      discountAmount = new Decimal(discount.value);
      if (discountAmount.greaterThan(subtotal)) {
        discountAmount = subtotal;
      }
    }

    const finalSubtotal = subtotal.minus(discountAmount);

    return { finalSubtotal, discountAmount };
  }

  private calculateTax(taxableAmount: Decimal, taxRate: number): Decimal {
    const rate = new Decimal(taxRate).dividedBy(100);
    return taxableAmount.times(rate);
  }

  private calculateGrandTotal(
    subtotal: Decimal,
    totalTax: Decimal,
    serviceFee?: Decimal,
    deliveryFee?: Decimal
  ): Decimal {
    let total = subtotal.plus(totalTax);

    if (serviceFee) {
      total = total.plus(serviceFee);
    }

    if (deliveryFee) {
      total = total.plus(deliveryFee);
    }

    return total;
  }
}
```

---

## **TESTING**

```typescript
describe('OrderCalculationService', () => {
  let service: OrderCalculationService;

  beforeEach(() => {
    service = new OrderCalculationService();
  });

  it('should calculate order with modifiers', () => {
    const result = service.calculateOrder({
      items: [
        {
          product: { id: '1', price: 50, taxRate: 15 },
          quantity: 2,
          modifiers: [{ price: 5 }]
        }
      ]
    });

    // Base: 50 * 2 = 100
    // Modifiers: 5 * 2 = 10
    // Subtotal: 110
    // Tax: 110 * 15% = 16.50
    // Total: 126.50

    expect(result.subtotal).toBe(110);
    expect(result.totalTax).toBe(16.5);
    expect(result.grandTotal).toBe(126.5);
  });

  it('should apply percentage discount', () => {
    const result = service.calculateOrder({
      items: [
        {
          product: { id: '1', price: 100, taxRate: 15 },
          quantity: 1
        }
      ],
      orderDiscount: { type: 'PERCENTAGE', value: 10 }
    });

    // Subtotal: 100
    // Discount: 10
    // After discount: 90
    // Tax: 90 * 15% = 13.50
    // Total: 103.50

    expect(result.totalDiscount).toBe(10);
    expect(result.subtotal).toBe(90);
    expect(result.grandTotal).toBe(103.5);
  });
});
```

---

## **CHECKLIST**

- [ ] All calculations use Decimal.js
- [ ] 7-step pipeline followed
- [ ] Item-level discounts calculated
- [ ] Order-level discounts calculated
- [ ] Tax calculated correctly
- [ ] Service/delivery fees added
- [ ] Grand total calculated
- [ ] Tests cover all scenarios

---

**NEXT**: [05-workflow-steps.md](05-workflow-steps.md)
