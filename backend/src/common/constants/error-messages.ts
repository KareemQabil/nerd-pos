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
  InvalidCredentials: {
    key: 'INVALID_CREDENTIALS',
    messageEn: 'Invalid credentials.',
    messageAr: 'بيانات الاعتماد غير صالحة.',
  },
  UserNotFound: {
    key: 'USER_NOT_FOUND',
    messageEn: 'User not found.',
    messageAr: 'المستخدم غير موجود.',
  },
  UsernameExists: {
    key: 'USERNAME_EXISTS',
    messageEn: 'Username already exists.',
    messageAr: 'اسم المستخدم موجود بالفعل.',
  },
  InvalidCurrentPassword: {
    key: 'INVALID_CURRENT_PASSWORD',
    messageEn: 'Current password is incorrect.',
    messageAr: 'كلمة المرور الحالية غير صحيحة.',
  },
  AccountInactive: {
    key: 'ACCOUNT_INACTIVE',
    messageEn: 'Account is inactive.',
    messageAr: 'الحساب غير نشط.',
  },
  ProfileAccessDenied: {
    key: 'PROFILE_ACCESS_DENIED',
    messageEn: 'You can only access your own profile.',
    messageAr: 'يمكنك الوصول إلى ملف التعريف الخاص بك فقط.',
  },
  RoleNameExists: {
    key: 'ROLE_NAME_EXISTS',
    messageEn: 'Role name already exists.',
    messageAr: 'اسم الدور موجود بالفعل.',
  },
  OrderItemsRequired: {
    key: 'ORDER_ITEMS_REQUIRED',
    messageEn: 'Order must have at least one item.',
    messageAr: 'يجب أن يحتوي الطلب على عنصر واحد على الأقل.',
  },
  SessionNotFound: {
    key: 'SESSION_NOT_FOUND',
    messageEn: 'Session not found.',
    messageAr: 'الجلسة غير موجودة.',
  },
  OrderNotFound: {
    key: 'ORDER_NOT_FOUND',
    messageEn: 'Order not found.',
    messageAr: 'الطلب غير موجود.',
  },
  OrderNotDraft: {
    key: 'ORDER_NOT_DRAFT',
    messageEn: 'Order is not in DRAFT status.',
    messageAr: 'الطلب ليس في حالة المسودة.',
  },
  InvalidStatusTransition: {
    key: 'INVALID_STATUS_TRANSITION',
    messageEn: 'Invalid order status transition.',
    messageAr: 'تحول حالة الطلب غير صالح.',
  },
  OrderFinalized: {
    key: 'ORDER_FINALIZED',
    messageEn: 'Order is already finalized.',
    messageAr: 'تم الانتهاء من الطلب بالفعل.',
  },
  WarehouseNotConfigured: {
    key: 'WAREHOUSE_NOT_CONFIGURED',
    messageEn: 'No valid warehouse configured.',
    messageAr: 'لا يوجد مستودع صالح مكون.',
  },
  NegativeStockAdjustment: {
    key: 'NEGATIVE_STOCK_ADJUSTMENT',
    messageEn: 'Adjustment would result in negative stock.',
    messageAr: 'التعديل سيؤدي إلى مخزون سالب.',
  },
  InventoryNotFound: {
    key: 'INVENTORY_NOT_FOUND',
    messageEn: 'No inventory found for product in warehouse.',
    messageAr: 'لا يوجد مخزون للمنتج في المستودع.',
  },
  InsufficientStock: {
    key: 'INSUFFICIENT_STOCK',
    messageEn: 'Insufficient stock.',
    messageAr: 'المخزون غير كاف.',
  },
  RecipeNotFound: {
    key: 'RECIPE_NOT_FOUND',
    messageEn: 'Recipe not found.',
    messageAr: 'الوصفة غير موجودة.',
  },
  CustomerPhoneExists: {
    key: 'CUSTOMER_PHONE_EXISTS',
    messageEn: 'Customer with this phone number already exists.',
    messageAr: 'رقم الهاتف موجود بالفعل لعميل آخر.',
  },
  CustomerNotFound: {
    key: 'CUSTOMER_NOT_FOUND',
    messageEn: 'Customer not found.',
    messageAr: 'العميل غير موجود.',
  },
  InsufficientLoyaltyPoints: {
    key: 'INSUFFICIENT_LOYALTY_POINTS',
    messageEn: 'Insufficient loyalty points.',
    messageAr: 'نقاط الولاء غير كافية.',
  },
  UserIdRequired: {
    key: 'USER_ID_REQUIRED',
    messageEn: 'User ID is required.',
    messageAr: 'مطلوب معرف المستخدم.',
  },
  SessionActive: {
    key: 'SESSION_ACTIVE',
    messageEn: 'User already has an open session.',
    messageAr: 'لدى المستخدم جلسة مفتوحة بالفعل.',
  },
  SessionClosed: {
    key: 'SESSION_CLOSED',
    messageEn: 'Session is already closed.',
    messageAr: 'الجلسة مغلقة بالفعل.',
  },
  PendingDraftOrders: {
    key: 'PENDING_DRAFT_ORDERS',
    messageEn: 'Cannot close session with pending draft orders.',
    messageAr: 'لا يمكن إغلاق الجلسة بوجود طلبات مسودة معلقة.',
  },
  PaymentNotFound: {
    key: 'PAYMENT_NOT_FOUND',
    messageEn: 'Payment not found.',
    messageAr: 'الدفع غير موجود.',
  },
  RefundNotFound: {
    key: 'REFUND_NOT_FOUND',
    messageEn: 'Refund not found.',
    messageAr: 'الاسترجاع غير موجود.',
  },
  InsufficientCash: {
    key: 'INSUFFICIENT_CASH',
    messageEn: 'Insufficient cash received.',
    messageAr: 'المبلغ النقدي المستلم غير كاف.',
  },
  InvalidPaymentAmount: {
    key: 'INVALID_PAYMENT_AMOUNT',
    messageEn: 'Payment amount must be greater than 0.',
    messageAr: 'يجب أن يكون مبلغ الدفع أكبر من 0.',
  },
  RefundExceedsPayment: {
    key: 'REFUND_EXCEEDS_PAYMENT',
    messageEn: 'Refund amount exceeds payment amount.',
    messageAr: 'مبلغ الاسترجاع يتجاوز مبلغ الدفع.',
  },
  InvalidRefundStatus: {
    key: 'INVALID_REFUND_STATUS',
    messageEn: 'Only pending refunds can be approved.',
    messageAr: 'يمكن الموافقة فقط على طلبات الاسترجاع المعلقة.',
  },
  TicketNotFound: {
    key: 'TICKET_NOT_FOUND',
    messageEn: 'Ticket not found.',
    messageAr: 'التذكرة غير موجودة.',
  },
  FloorNotFound: {
    key: 'FLOOR_NOT_FOUND',
    messageEn: 'Floor not found.',
    messageAr: 'الطابق غير موجود.',
  },
  TableNotFound: {
    key: 'TABLE_NOT_FOUND',
    messageEn: 'Table not found.',
    messageAr: 'الطاولة غير موجودة.',
  },
  TableNotAvailable: {
    key: 'TABLE_NOT_AVAILABLE',
    messageEn: 'Table is not available.',
    messageAr: 'الطاولة غير متاحة.',
  },
  TableReserved: {
    key: 'TABLE_RESERVED',
    messageEn: 'Table is reserved.',
    messageAr: 'الطاولة محجوزة.',
  },
  ReservationConflict: {
    key: 'RESERVATION_CONFLICT',
    messageEn: 'Table already reserved for this time.',
    messageAr: 'الطاولة محجوزة بالفعل في هذا الوقت.',
  },
  StoreSettingsNotFound: {
    key: 'STORE_SETTINGS_NOT_FOUND',
    messageEn: 'Store settings not found.',
    messageAr: 'إعدادات المتجر غير موجودة.',
  },
  DefaultTaxNotConfigured: {
    key: 'DEFAULT_TAX_NOT_CONFIGURED',
    messageEn: 'Default tax not configured.',
    messageAr: 'الضريبة الافتراضية غير مهيأة.',
  },
  TerminalNotFound: {
    key: 'TERMINAL_NOT_FOUND',
    messageEn: 'Terminal not found.',
    messageAr: 'المحطة غير موجودة.',
  },
  DiscountNotFound: {
    key: 'DISCOUNT_NOT_FOUND',
    messageEn: 'Discount not found.',
    messageAr: 'الخصم غير موجود.',
  },
  DeliveryZoneNotFound: {
    key: 'DELIVERY_ZONE_NOT_FOUND',
    messageEn: 'No delivery zone found for this address.',
    messageAr: 'لا توجد منطقة توصيل لهذا العنوان.',
  },
  DriverNotAvailable: {
    key: 'DRIVER_NOT_AVAILABLE',
    messageEn: 'Driver is not available.',
    messageAr: 'السائق غير متاح.',
  },
  InvoiceExists: {
    key: 'INVOICE_EXISTS',
    messageEn: 'Invoice already exists for this order.',
    messageAr: 'الفاتورة موجودة بالفعل لهذا الطلب.',
  },
  InvoiceNotFound: {
    key: 'INVOICE_NOT_FOUND',
    messageEn: 'Invoice not found.',
    messageAr: 'الفاتورة غير موجودة.',
  },
  HashChainValidationFailed: {
    key: 'HASH_CHAIN_VALIDATION_FAILED',
    messageEn: 'ZATCA hash chain validation failed.',
    messageAr: 'فشل التحقق من سلسلة التشفير لهيئة الزكاة.',
  },
} as const;

export type ErrorMessageKey = keyof typeof ErrorMessages;
export type ErrorMessageValue = (typeof ErrorMessages)[ErrorMessageKey];
