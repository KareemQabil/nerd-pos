// Prisma Seed Script
// Source: Complete seed data for NerdPOS backend
// Run: npx prisma db seed

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

// Prisma 7 requires adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Starting seed...');

    // ============================================================================
    // 1. STORE SETTINGS (Required first - foundational)
    // ============================================================================
    console.log('📦 Seeding store settings...');

    await prisma.storeSettings.upsert({
        where: { id: 'store-settings-1' },
        update: {},
        create: {
            id: 'store-settings-1',
            nameAr: 'مطعم نيرد بوس',
            nameEn: 'NerdPOS Restaurant',
            taxNumber: '300000000000003',
            taxRate: 0.15, // 15% VAT
            serviceCharge: 0.0, // No service charge
            currency: 'SAR',
            timezone: 'Asia/Riyadh',
            locale: 'ar-SA',
            address: 'شارع الملك فهد، الرياض، المملكة العربية السعودية',
            phone: '+966500000000',
            email: 'info@nerdpos.com',
            logo: null,
        },
    });

    // ============================================================================
    // 2. USERS (5 roles: ADMIN, MANAGER, CASHIER, WAITER, KITCHEN)
    // ============================================================================
    console.log('👤 Seeding users...');

    const hashedPassword = await bcrypt.hash('nerdpos123', 10);
    const hashedPin = await bcrypt.hash('1234', 10);

    const users = [
        {
            id: 'user-admin-1',
            username: 'admin',
            password: hashedPassword,
            nameAr: 'مدير النظام',
            nameEn: 'System Admin',
            email: 'admin@nerdpos.com',
            phone: '+966500000001',
            role: 'ADMIN',
            isActive: true,
        },
        {
            id: 'user-manager-1',
            username: 'manager',
            password: hashedPassword,
            nameAr: 'مدير المطعم',
            nameEn: 'Restaurant Manager',
            email: 'manager@nerdpos.com',
            phone: '+966500000002',
            role: 'MANAGER',
            isActive: true,
        },
        {
            id: 'user-cashier-1',
            username: 'cashier1',
            password: hashedPassword,
            nameAr: 'كاشير ١',
            nameEn: 'Cashier 1',
            email: 'cashier1@nerdpos.com',
            phone: '+966500000003',
            role: 'CASHIER',
            isActive: true,
        },
        {
            id: 'user-waiter-1',
            username: 'waiter1',
            password: hashedPassword,
            nameAr: 'نادل ١',
            nameEn: 'Waiter 1',
            email: null,
            phone: '+966500000004',
            role: 'WAITER',
            isActive: true,
        },
        {
            id: 'user-kitchen-1',
            username: 'kitchen1',
            password: hashedPassword,
            nameAr: 'شيف المطبخ',
            nameEn: 'Kitchen Chef',
            email: null,
            phone: '+966500000005',
            role: 'KITCHEN',
            isActive: true,
        },
    ];

    for (const user of users) {
        await prisma.user.upsert({
            where: { username: user.username },
            update: {},
            create: user,
        });
    }

    // ============================================================================
    // 3. PAYMENT METHODS (4: CASH, CARD, WALLET, BANK_TRANSFER)
    // ============================================================================
    console.log('💳 Seeding payment methods...');

    const paymentMethods = [
        {
            id: 'pm-cash',
            code: 'CASH',
            nameAr: 'نقدي',
            nameEn: 'Cash',
            type: 'CASH',
            requiresTerminal: false,
            requiresReference: false,
            isActive: true,
            sortOrder: 1,
        },
        {
            id: 'pm-card',
            code: 'CARD',
            nameAr: 'بطاقة',
            nameEn: 'Card',
            type: 'CARD',
            requiresTerminal: true,
            requiresReference: true,
            isActive: true,
            sortOrder: 2,
        },
        {
            id: 'pm-mada',
            code: 'MADA',
            nameAr: 'مدى',
            nameEn: 'Mada',
            type: 'CARD',
            requiresTerminal: true,
            requiresReference: true,
            isActive: true,
            sortOrder: 3,
        },
        {
            id: 'pm-wallet',
            code: 'WALLET',
            nameAr: 'محفظة',
            nameEn: 'Digital Wallet',
            type: 'DIGITAL',
            requiresTerminal: false,
            requiresReference: true,
            isActive: true,
            sortOrder: 4,
        },
    ];

    for (const pm of paymentMethods) {
        await prisma.paymentMethodConfig.upsert({
            where: { code: pm.code },
            update: {},
            create: pm,
        });
    }

    // ============================================================================
    // 4. WAREHOUSE (Default warehouse)
    // ============================================================================
    console.log('🏭 Seeding warehouses...');

    await prisma.warehouse.upsert({
        where: { code: 'MAIN' },
        update: {},
        create: {
            id: 'warehouse-main',
            code: 'MAIN',
            nameAr: 'المستودع الرئيسي',
            nameEn: 'Main Warehouse',
            isDefault: true,
            isActive: true,
        },
    });

    // ============================================================================
    // 5. CATEGORIES (Restaurant categories)
    // ============================================================================
    console.log('📂 Seeding categories...');

    const categories = [
        {
            id: 'cat-beverages',
            parentId: null,
            nameAr: 'المشروبات',
            nameEn: 'Beverages',
            imageUrl: null,
            sortOrder: 1,
            isActive: true,
        },
        {
            id: 'cat-appetizers',
            parentId: null,
            nameAr: 'المقبلات',
            nameEn: 'Appetizers',
            imageUrl: null,
            sortOrder: 2,
            isActive: true,
        },
        {
            id: 'cat-main-dishes',
            parentId: null,
            nameAr: 'الأطباق الرئيسية',
            nameEn: 'Main Dishes',
            imageUrl: null,
            sortOrder: 3,
            isActive: true,
        },
        {
            id: 'cat-desserts',
            parentId: null,
            nameAr: 'الحلويات',
            nameEn: 'Desserts',
            imageUrl: null,
            sortOrder: 4,
            isActive: true,
        },
        {
            id: 'cat-grills',
            parentId: 'cat-main-dishes',
            nameAr: 'المشويات',
            nameEn: 'Grills',
            imageUrl: null,
            sortOrder: 1,
            isActive: true,
        },
        {
            id: 'cat-sandwiches',
            parentId: 'cat-main-dishes',
            nameAr: 'السندويشات',
            nameEn: 'Sandwiches',
            imageUrl: null,
            sortOrder: 2,
            isActive: true,
        },
    ];

    // First pass: Create categories without parent
    for (const cat of categories.filter(c => !c.parentId)) {
        await prisma.category.upsert({
            where: { id: cat.id },
            update: {},
            create: cat,
        });
    }

    // Second pass: Create subcategories
    for (const cat of categories.filter(c => c.parentId)) {
        await prisma.category.upsert({
            where: { id: cat.id },
            update: {},
            create: cat,
        });
    }

    // ============================================================================
    // 6. PRODUCTS (Sample products for each category)
    // ============================================================================
    console.log('🍔 Seeding products...');

    const products = [
        // Beverages
        {
            id: 'prod-water',
            sku: 'BEV-001',
            barcode: '6281000000001',
            nameAr: 'مياه معدنية',
            nameEn: 'Mineral Water',
            categoryId: 'cat-beverages',
            price: 2.00,
            cost: 0.50,
            taxCategory: 'STANDARD',
            unitOfMeasure: 'PIECE',
            trackInventory: true,
        },
        {
            id: 'prod-coffee',
            sku: 'BEV-002',
            barcode: '6281000000002',
            nameAr: 'قهوة عربية',
            nameEn: 'Arabic Coffee',
            categoryId: 'cat-beverages',
            price: 15.00,
            cost: 3.00,
            taxCategory: 'STANDARD',
            unitOfMeasure: 'PIECE',
            trackInventory: false,
        },
        {
            id: 'prod-juice',
            sku: 'BEV-003',
            barcode: '6281000000003',
            nameAr: 'عصير برتقال طازج',
            nameEn: 'Fresh Orange Juice',
            categoryId: 'cat-beverages',
            price: 18.00,
            cost: 5.00,
            taxCategory: 'STANDARD',
            unitOfMeasure: 'PIECE',
            trackInventory: true,
        },
        // Appetizers
        {
            id: 'prod-hummus',
            sku: 'APP-001',
            barcode: '6281000000010',
            nameAr: 'حمص',
            nameEn: 'Hummus',
            categoryId: 'cat-appetizers',
            price: 20.00,
            cost: 5.00,
            taxCategory: 'STANDARD',
            unitOfMeasure: 'PIECE',
            trackInventory: false,
            preparationTimeMinutes: 5,
        },
        {
            id: 'prod-fattoush',
            sku: 'APP-002',
            barcode: '6281000000011',
            nameAr: 'فتوش',
            nameEn: 'Fattoush Salad',
            categoryId: 'cat-appetizers',
            price: 25.00,
            cost: 7.00,
            taxCategory: 'STANDARD',
            unitOfMeasure: 'PIECE',
            trackInventory: false,
            preparationTimeMinutes: 10,
        },
        // Main Dishes - Grills
        {
            id: 'prod-shawarma',
            sku: 'GRL-001',
            barcode: '6281000000020',
            nameAr: 'شاورما لحم',
            nameEn: 'Beef Shawarma',
            categoryId: 'cat-grills',
            price: 35.00,
            cost: 12.00,
            taxCategory: 'STANDARD',
            unitOfMeasure: 'PIECE',
            trackInventory: true,
            hasModifiers: true,
            preparationTimeMinutes: 15,
        },
        {
            id: 'prod-mixed-grill',
            sku: 'GRL-002',
            barcode: '6281000000021',
            nameAr: 'مشكل مشاوي',
            nameEn: 'Mixed Grill Platter',
            categoryId: 'cat-grills',
            price: 95.00,
            cost: 35.00,
            taxCategory: 'STANDARD',
            unitOfMeasure: 'PIECE',
            trackInventory: true,
            hasModifiers: true,
            preparationTimeMinutes: 25,
        },
        // Main Dishes - Sandwiches
        {
            id: 'prod-chicken-sandwich',
            sku: 'SAN-001',
            barcode: '6281000000030',
            nameAr: 'ساندويش دجاج',
            nameEn: 'Chicken Sandwich',
            categoryId: 'cat-sandwiches',
            price: 28.00,
            cost: 8.00,
            taxCategory: 'STANDARD',
            unitOfMeasure: 'PIECE',
            trackInventory: true,
            hasModifiers: true,
            preparationTimeMinutes: 10,
        },
        // Desserts
        {
            id: 'prod-kunafa',
            sku: 'DES-001',
            barcode: '6281000000040',
            nameAr: 'كنافة',
            nameEn: 'Kunafa',
            categoryId: 'cat-desserts',
            price: 30.00,
            cost: 10.00,
            taxCategory: 'STANDARD',
            unitOfMeasure: 'PIECE',
            trackInventory: false,
            preparationTimeMinutes: 5,
        },
        {
            id: 'prod-ice-cream',
            sku: 'DES-002',
            barcode: '6281000000041',
            nameAr: 'آيس كريم',
            nameEn: 'Ice Cream',
            categoryId: 'cat-desserts',
            price: 15.00,
            cost: 4.00,
            taxCategory: 'STANDARD',
            unitOfMeasure: 'PIECE',
            trackInventory: true,
        },
    ];

    for (const product of products) {
        await prisma.product.upsert({
            where: { sku: product.sku },
            update: {},
            create: product,
        });
    }

    // ============================================================================
    // 7. MODIFIER GROUPS (For products with modifiers)
    // ============================================================================
    console.log('🔧 Seeding modifier groups...');

    const modifierGroups = [
        {
            id: 'mod-size',
            nameAr: 'الحجم',
            nameEn: 'Size',
            selectionType: 'SINGLE',
            isRequired: true,
            minSelections: 1,
            maxSelections: 1,
            sortOrder: 1,
            isActive: true,
        },
        {
            id: 'mod-extras',
            nameAr: 'إضافات',
            nameEn: 'Extras',
            selectionType: 'MULTIPLE',
            isRequired: false,
            minSelections: 0,
            maxSelections: 5,
            sortOrder: 2,
            isActive: true,
        },
        {
            id: 'mod-spice',
            nameAr: 'درجة الحرارة',
            nameEn: 'Spice Level',
            selectionType: 'SINGLE',
            isRequired: false,
            minSelections: 0,
            maxSelections: 1,
            sortOrder: 3,
            isActive: true,
        },
    ];

    for (const mg of modifierGroups) {
        await prisma.modifierGroup.upsert({
            where: { id: mg.id },
            update: {},
            create: mg,
        });
    }

    // ============================================================================
    // 8. MODIFIER OPTIONS
    // ============================================================================
    console.log('📋 Seeding modifier options...');

    const modifierOptions = [
        // Size options
        { id: 'opt-small', groupId: 'mod-size', nameAr: 'صغير', nameEn: 'Small', price: 0, isDefault: true, sortOrder: 1 },
        { id: 'opt-medium', groupId: 'mod-size', nameAr: 'وسط', nameEn: 'Medium', price: 5, isDefault: false, sortOrder: 2 },
        { id: 'opt-large', groupId: 'mod-size', nameAr: 'كبير', nameEn: 'Large', price: 10, isDefault: false, sortOrder: 3 },
        // Extra options
        { id: 'opt-cheese', groupId: 'mod-extras', nameAr: 'جبن إضافي', nameEn: 'Extra Cheese', price: 5, isDefault: false, sortOrder: 1 },
        { id: 'opt-bacon', groupId: 'mod-extras', nameAr: 'لحم', nameEn: 'Extra Meat', price: 10, isDefault: false, sortOrder: 2 },
        { id: 'opt-veggies', groupId: 'mod-extras', nameAr: 'خضار إضافي', nameEn: 'Extra Veggies', price: 3, isDefault: false, sortOrder: 3 },
        // Spice levels
        { id: 'opt-mild', groupId: 'mod-spice', nameAr: 'خفيف', nameEn: 'Mild', price: 0, isDefault: true, sortOrder: 1 },
        { id: 'opt-medium-spice', groupId: 'mod-spice', nameAr: 'متوسط', nameEn: 'Medium', price: 0, isDefault: false, sortOrder: 2 },
        { id: 'opt-hot', groupId: 'mod-spice', nameAr: 'حار', nameEn: 'Hot', price: 0, isDefault: false, sortOrder: 3 },
    ];

    for (const opt of modifierOptions) {
        await prisma.modifierOption.upsert({
            where: { id: opt.id },
            update: {},
            create: opt,
        });
    }

    // ============================================================================
    // 9. PRODUCT-MODIFIER GROUP ASSOCIATIONS
    // ============================================================================
    console.log('🔗 Seeding product-modifier associations...');

    const productModifiers = [
        { productId: 'prod-shawarma', modifierGroupId: 'mod-size' },
        { productId: 'prod-shawarma', modifierGroupId: 'mod-extras' },
        { productId: 'prod-shawarma', modifierGroupId: 'mod-spice' },
        { productId: 'prod-mixed-grill', modifierGroupId: 'mod-size' },
        { productId: 'prod-mixed-grill', modifierGroupId: 'mod-spice' },
        { productId: 'prod-chicken-sandwich', modifierGroupId: 'mod-size' },
        { productId: 'prod-chicken-sandwich', modifierGroupId: 'mod-extras' },
    ];

    for (const pm of productModifiers) {
        await prisma.productModifierGroup.upsert({
            where: {
                productId_modifierGroupId: {
                    productId: pm.productId,
                    modifierGroupId: pm.modifierGroupId,
                },
            },
            update: {},
            create: pm,
        });
    }

    // ============================================================================
    // 10. INVENTORY ITEMS (Initial stock for tracked products)
    // ============================================================================
    console.log('📊 Seeding inventory items...');

    const inventoryProducts = ['prod-water', 'prod-juice', 'prod-shawarma', 'prod-mixed-grill', 'prod-chicken-sandwich', 'prod-ice-cream'];

    for (const productId of inventoryProducts) {
        await prisma.inventoryItem.upsert({
            where: {
                productId_warehouseId: {
                    productId,
                    warehouseId: 'warehouse-main',
                },
            },
            update: {},
            create: {
                productId,
                warehouseId: 'warehouse-main',
                quantityOnHand: 100,
                quantityReserved: 0,
                minimumLevel: 10,
                reorderPoint: 20,
                averageCost: 0,
            },
        });
    }

    // ============================================================================
    // 11. SAMPLE CUSTOMERS
    // ============================================================================
    console.log('👥 Seeding customers...');

    const customers = [
        {
            id: 'cust-walk-in',
            code: 'WALK-IN',
            nameAr: 'زبون عابر',
            nameEn: 'Walk-in Customer',
            phone: null,
            email: null,
            loyaltyPoints: 0,
            loyaltyTier: 'BRONZE',
            totalSpent: 0,
            visitsCount: 0,
            isActive: true,
        },
        {
            id: 'cust-regular-1',
            code: 'CUST-001',
            nameAr: 'أحمد محمد',
            nameEn: 'Ahmed Mohammed',
            phone: '+966550000001',
            email: 'ahmed@example.com',
            loyaltyPoints: 500,
            loyaltyTier: 'SILVER',
            totalSpent: 2500,
            visitsCount: 25,
            isActive: true,
        },
        {
            id: 'cust-vip-1',
            code: 'VIP-001',
            nameAr: 'محمد العلي',
            nameEn: 'Mohammed Al-Ali',
            phone: '+966550000002',
            email: 'mohammed.ali@example.com',
            loyaltyPoints: 2000,
            loyaltyTier: 'GOLD',
            totalSpent: 15000,
            visitsCount: 100,
            isActive: true,
        },
    ];

    for (const customer of customers) {
        await prisma.customer.upsert({
            where: { code: customer.code },
            update: {},
            create: customer,
        });
    }

    console.log('✅ Seed completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  - Store Settings: 1');
    console.log('  - Users: 5 (admin, manager, cashier1, waiter1, kitchen1)');
    console.log('  - Payment Methods: 4 (CASH, CARD, MADA, WALLET)');
    console.log('  - Warehouses: 1 (MAIN)');
    console.log('  - Categories: 6 (4 main + 2 sub)');
    console.log('  - Products: 10');
    console.log('  - Modifier Groups: 3 (Size, Extras, Spice)');
    console.log('  - Modifier Options: 9');
    console.log('  - Inventory Items: 6');
    console.log('  - Customers: 3 (Walk-in + 2 regular)');
    console.log('');
    console.log('🔐 Default credentials:');
    console.log('  - All users password: nerdpos123');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
