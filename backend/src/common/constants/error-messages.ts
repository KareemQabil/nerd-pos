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
} as const;

export type ErrorMessageKey = keyof typeof ErrorMessages;
export type ErrorMessageValue = (typeof ErrorMessages)[ErrorMessageKey];
