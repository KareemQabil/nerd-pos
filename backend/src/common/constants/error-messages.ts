export interface ErrorMessageDefinition {
  key: string;
  messageEn: string;
  messageAr: string;
}

export const ErrorMessages = {
  InternalServerError: {
    key: 'INTERNAL_SERVER_ERROR',
    messageEn: 'Unexpected server error.',
    messageAr: 'حدث خطأ غير متوقع في الخادم.',
  },
  BadRequest: {
    key: 'BAD_REQUEST',
    messageEn: 'Bad request.',
    messageAr: 'طلب غير صالح.',
  },
  Unauthorized: {
    key: 'UNAUTHORIZED',
    messageEn: 'Unauthorized.',
    messageAr: 'غير مصرح.',
  },
  Forbidden: {
    key: 'FORBIDDEN',
    messageEn: 'Forbidden.',
    messageAr: 'ممنوع.',
  },
  NotFound: {
    key: 'NOT_FOUND',
    messageEn: 'Resource not found.',
    messageAr: 'العنصر غير موجود.',
  },
  Conflict: {
    key: 'CONFLICT',
    messageEn: 'Conflict.',
    messageAr: 'تعارض.',
  },
  UnprocessableEntity: {
    key: 'UNPROCESSABLE_ENTITY',
    messageEn: 'Unprocessable entity.',
    messageAr: 'بيانات غير قابلة للمعالجة.',
  },
  TooManyRequests: {
    key: 'TOO_MANY_REQUESTS',
    messageEn: 'Too many requests.',
    messageAr: 'طلبات كثيرة جدًا.',
  },
  ValidationError: {
    key: 'VALIDATION_ERROR',
    messageEn: 'Validation error.',
    messageAr: 'خطأ في التحقق من البيانات.',
  },
  ParentCategoryNotFound: {
    key: 'PARENT_CATEGORY_NOT_FOUND',
    messageEn: 'Parent category not found.',
    messageAr: 'الفئه الاساسية غير موجوده',
  },
  ProductNotFound: {
    key: 'PRODUCT_NOT_FOUND',
    messageEn: 'Product not found.',
    messageAr: 'المنتج غير موجود.',
  },
  ProductSkuNotFound: {
    key: 'PRODUCT_SKU_NOT_FOUND',
    messageEn: 'Product with SKU not found.',
    messageAr: 'المنتج برقم SKU غير موجود.',
  },
  CategoryNotFound: {
    key: 'CATEGORY_NOT_FOUND',
    messageEn: 'Category not found.',
    messageAr: 'الفئة غير موجودة.',
  },
  ModifierGroupNotFound: {
    key: 'MODIFIER_GROUP_NOT_FOUND',
    messageEn: 'Modifier group not found.',
    messageAr: 'مجموعة الإضافات غير موجودة.',
  },
  InvalidPrice: {
    key: 'INVALID_PRICE',
    messageEn: 'Price must be a valid number.',
    messageAr: 'السعر يجب أن يكون رقمًا صالحًا.',
  },
  NegativePrice: {
    key: 'NEGATIVE_PRICE',
    messageEn: 'Price must be non-negative.',
    messageAr: 'السعر يجب ألا يكون سالبًا.',
  },
} as const;

export type ErrorMessageKey = keyof typeof ErrorMessages;
export type ErrorMessageValue = (typeof ErrorMessages)[ErrorMessageKey];
