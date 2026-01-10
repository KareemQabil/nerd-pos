# Form Handling

**Library**: React Hook Form  
**Validation**: Zod  
**Pattern**: Controlled components  

---

## **ZOD SCHEMA**

```typescript
// lib/schemas/product.schema.ts
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  price: z.number().positive('Price must be positive'),
  categoryId: z.string().uuid('Invalid category'),
  barcode: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
  modifiers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
  })).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
```

---

## **FORM COMPONENT**

```tsx
// components/forms/ProductForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, ProductFormData } from '@/lib/schemas/product.schema';
import { useCreateProduct } from '@/hooks/useProducts';

interface Props {
  onSuccess?: () => void;
}

export function ProductForm({ onSuccess }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      active: true,
    },
  });

  const { mutate: createProduct } = useCreateProduct();

  const onSubmit = async (data: ProductFormData) => {
    createProduct(data, {
      onSuccess: () => {
        onSuccess?.();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name">Product Name</label>
        <input
          id="name"
          {...register('name')}
          className="w-full px-3 py-2 border rounded"
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="price">Price</label>
        <input
          id="price"
          type="number"
          step="0.01"
          {...register('price', { valueAsNumber: true })}
          className="w-full px-3 py-2 border rounded"
        />
        {errors.price && (
          <p className="text-red-500 text-sm">{errors.price.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="categoryId">Category</label>
        <select
          id="categoryId"
          {...register('categoryId')}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">Select category</option>
          {/* Options from API */}
        </select>
        {errors.categoryId && (
          <p className="text-red-500 text-sm">{errors.categoryId.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          type="checkbox"
          {...register('active')}
        />
        <label htmlFor="active">Active</label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save Product'}
      </button>
    </form>
  );
}
```

---

## **REUSABLE INPUT**

```tsx
// components/atoms/FormInput.tsx
import { forwardRef } from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormInput = forwardRef<HTMLInputElement, Props>(
  ({ label, error, ...props }, ref) => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">{label}</label>
        <input
          ref={ref}
          className={`w-full px-3 py-2 border rounded ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          {...props}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  }
);
```

---

## **USAGE WITH FORMSINPUT**

```tsx
<FormInput
  label="Product Name"
  {...register('name')}
  error={errors.name?.message}
/>
```

---

**NEXT**: [07-styling.md](07-styling.md)
