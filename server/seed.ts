import { db } from './db';
import { restaurants, tables, menuItems, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';

export async function seedDemoData() {
  try {
    console.log('🌱 Seeding demo data...');

    // Create demo user (restaurant owner)
    const [demoUser] = await db.insert(users).values({
      id: 'demo-user',
      email: 'demo@restaurant.com',
      firstName: 'Demo',
      lastName: 'Owner'
    }).onConflictDoNothing().returning();

    console.log('✅ Created demo user');

    // Create demo restaurant with UUID
    const restaurantId = '550e8400-e29b-41d4-a716-446655440000'; // Fixed UUID for demo
    const [demoRestaurant] = await db.insert(restaurants).values({
      id: restaurantId,
      name: 'Demo Restaurant',
      ownerId: 'demo-user',
      settings: {
        currency: 'USD',
        timezone: 'UTC',
        openHours: '9:00-22:00'
      }
    }).onConflictDoNothing().returning();

    console.log('✅ Created demo restaurant');

    // Create demo tables with QR codes
    const tableData = [
      { number: 'Table-001', qrCode: 'demo-table-001' },
      { number: 'Table-002', qrCode: 'demo-table-002' },
      { number: 'Table-003', qrCode: 'demo-table-003' }
    ];

    for (const table of tableData) {
      await db.insert(tables).values({
        restaurantId: restaurantId,
        tableNumber: table.number,
        qrCode: table.qrCode,
        status: 'available',
        sessionData: {}
      }).onConflictDoNothing();
    }

    console.log('✅ Created demo tables');

    // Create demo menu items
    const menuCategories = [
      {
        category: 'Appetizers',
        items: [
          { name: 'Buffalo Wings', description: 'Spicy chicken wings with blue cheese', price: '12.99' },
          { name: 'Mozzarella Sticks', description: 'Crispy breaded mozzarella with marinara', price: '9.99' },
          { name: 'Nachos Supreme', description: 'Loaded nachos with cheese, jalapeños, and salsa', price: '14.99' }
        ]
      },
      {
        category: 'Main Dishes',
        items: [
          { name: 'Classic Burger', description: 'Beef patty with lettuce, tomato, and fries', price: '16.99' },
          { name: 'Chicken Caesar Salad', description: 'Grilled chicken on romaine with caesar dressing', price: '14.99' },
          { name: 'Fish & Chips', description: 'Beer-battered cod with crispy fries', price: '18.99' },
          { name: 'Margherita Pizza', description: 'Fresh mozzarella, basil, and tomato sauce', price: '15.99' }
        ]
      },
      {
        category: 'Beverages',
        items: [
          { name: 'Craft Beer', description: 'Local IPA on tap', price: '6.99' },
          { name: 'House Wine', description: 'Red or white wine by the glass', price: '8.99' },
          { name: 'Soft Drinks', description: 'Coke, Pepsi, Sprite, or Orange', price: '3.99' },
          { name: 'Fresh Juice', description: 'Orange, apple, or cranberry', price: '4.99' }
        ]
      },
      {
        category: 'Desserts',
        items: [
          { name: 'Chocolate Cake', description: 'Rich chocolate cake with vanilla ice cream', price: '8.99' },
          { name: 'Cheesecake', description: 'New York style with berry compote', price: '7.99' }
        ]
      }
    ];

    for (const category of menuCategories) {
      for (const item of category.items) {
        await db.insert(menuItems).values({
          restaurantId: restaurantId,
          category: category.category,
          name: item.name,
          description: item.description,
          price: item.price,
          available: true,
          imageUrl: null
        }).onConflictDoNothing();
      }
    }

    console.log('✅ Created demo menu items');
    console.log('🎉 Demo data seeded successfully!');

    console.log('\n📱 Demo URLs:');
    console.log('Customer Interface: /table/demo-table-001');
    console.log(`Restaurant Dashboard: /restaurant/${restaurantId}/kitchen`);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoData().then(() => process.exit(0)).catch(() => process.exit(1));
}