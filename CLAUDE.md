# Claude Code Project Briefing: Restaurant Table Ordering System

## 🎯 Project Overview
This is a **collaborative restaurant table ordering system** originally built by Replit Agent 3. The system has been ported to localhost and needs tweaks to run locally.

## 📋 System Architecture & Features

### **Dual-Interface Design**
- **Customer Interface**: Mobile-optimized at `/table/[qr-code]` (no login required)
- **Restaurant Interface**: Tablet-optimized at `/restaurant/[restaurant-id]/kitchen` (login required)

### **Core Functionality**
1. **QR Code Scanning**: Customers scan table QR codes to join shared ordering workspace
2. **Collaborative Ordering**: Multiple people at same table can add items to shared cart in real-time
3. **Live Updates**: WebSocket connections for real-time synchronization
4. **Order Management**: Restaurant staff receive orders on tablet dashboard
5. **Kitchen Workflow**: Orders move through preparation stages (New → Preparing → Ready → Served)



### **Technical Stack (Implemented)**
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript + Node.js
- **Database**: PostgreSQL + Drizzle ORM + Zod validation
- **Real-time**: Custom WebSocket implementation (not Socket.io)
- **Authentication**: JWT tokens for restaurant staff
- **Build Tool**: Vite with HMR (Hot Module Reload)
- **CSS Framework**: Tailwind CSS with custom components
- **Type Safety**: Full TypeScript coverage across client/server/shared

## 🏗️ Actual Project Structure (From Replit Agent 3)
```
/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── collaborative-cart.tsx
│   │   │   ├── order-management.tsx
│   │   │   └── qr-code-generator.tsx
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts
│   │   ├── lib/
│   │   ├── pages/
│   │   │   ├── customer-order.tsx
│   │   │   ├── home.tsx
│   │   │   └── restaurant-dashboard.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
├── server/                    # Express.js backend
│   ├── db.ts                  # Database connection
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # API routes
│   ├── storage.ts            # Database operations
│   └── vite.ts               # Vite integration
├── shared/                    # Shared types and schemas
│   └── schema.ts             # Drizzle ORM schemas + Zod validation
├── package.json
├── drizzle.config.ts         # Database migration config
├── tailwind.config.ts        # Tailwind CSS config
└── tsconfig.json
```

## 🎯 Your Mission as Coding Agent

### **Phase 1: Analysis & Assessment**
1. **Analyze the current codebase structure**
2. **Identify what's working vs. what needs fixes**
3. **Check database configuration and connections**
4. **Verify WebSocket/real-time functionality**
5. **Test authentication system**

### **Phase 2: Localhost Migration Fixes**
Common issues to address:
- **Database Connection**: Update connection strings for local PostgreSQL
- **Environment Variables**: Set up `.env` file for local development
- **Port Configuration**: Ensure proper localhost ports
- **WebSocket Configuration**: Fix WebSocket URLs for localhost
- **CORS Settings**: Configure for local development
- **Static File Serving**: Fix asset paths
- **API Endpoints**: Update base URLs from Replit to localhost

### **Phase 3: Feature Completion & Enhancement**
- **Test QR code generation and scanning**
- **Verify collaborative cart functionality**
- **Ensure real-time updates work between customer and restaurant interfaces**
- **Test order workflow from placement to kitchen**
- **Add any missing error handling**

## 🔧 Expected Issues & Solutions

### **Database Setup**
```bash
# Likely needed:
createdb restaurant_ordering
psql restaurant_ordering < database/schema.sql
```

### **Environment Configuration**
```env
# .env file probably needed:
DATABASE_URL=postgresql://localhost:5432/restaurant_ordering
PORT=3000
NODE_ENV=development
WEBSOCKET_PORT=3001
JWT_SECRET=your-secret-key
```

### **Package Installation**
```bash
npm install
# or
yarn install
```

## 🎨 UI/UX Requirements

### **Customer Interface (Mobile)**
- **Welcome Screen**: After QR scan, show table info and current order status
- **Menu Browsing**: Category tabs, search, add to cart functionality
- **Shared Cart**: Show who added what, live updates, quantity controls
- **Order Confirmation**: Success screen with order details and timing
- **Order Status**: Live tracking with progress timeline

### **Restaurant Interface (Tablet)**
- **Login Screen**: Staff authentication
- **Main Dashboard**: All active orders from all tables
- **Order Detail View**: Complete order info with special requests
- **Kitchen Workflow**: Kanban board for order stages
- **Table Management**: Visual floor layout with table statuses
- **Analytics Dashboard**: Performance metrics and insights

## 🚀 Success Criteria

### **Customer Experience**
- [ ] QR code scanning works and creates table workspace
- [ ] Multiple people can join same table session
- [ ] Real-time collaborative cart updates
- [ ] Order placement flows to restaurant dashboard
- [ ] Live order status tracking

### **Restaurant Experience**
- [ ] Staff can log in securely
- [ ] Orders appear instantly from all tables
- [ ] Kitchen workflow management functions
- [ ] Table statuses update in real-time
- [ ] Analytics data displays correctly

### **Technical Requirements**
- [ ] Runs on localhost without Replit dependencies
- [ ] Database connections work locally
- [ ] WebSocket real-time features function
- [ ] Authentication system secure
- [ ] Mobile-responsive customer interface
- [ ] Tablet-optimized restaurant interface

## ✅ Current Implementation Status (From Replit Agent 3)

### **Completed Features**
- **✅ Restaurant Authentication**: JWT-based login/logout system working
- **✅ QR Code Generation**: Dynamic table QR codes (Table-001, Table-002, etc.)
- **✅ Customer Interface**: Mobile-optimized menu browsing and cart
- **✅ Menu System**: Categories, items, pricing - fully functional
- **✅ Order Placement**: Secure server-side pricing calculation
- **✅ Real-time WebSocket**: Custom implementation for live updates
- **✅ Database Schema**: PostgreSQL with Drizzle ORM, all tables created
- **✅ Security Hardening**: All critical vulnerabilities fixed
- **✅ Multi-restaurant Support**: Data isolation implemented

### **Working Components**
- Restaurant staff can log in and access dashboard
- Tables can be created with unique QR codes
- Customers can scan QR codes and browse menu
- Collaborative cart with real-time updates
- Order creation with server-side validation
- Kitchen workflow status updates
- Table session management

### **Partially Working**
- **WebSocket Real-time Sync**: Implementation exists but needs localhost testing
- **Restaurant Dashboard**: Backend API complete, frontend needs testing
- **Order Status Tracking**: Database/API ready, UI needs verification

### **Deployment Notes**
- Currently limited by Replit Agent usage (user hit free tier limit)
- System successfully passed security audits
- Database schema migrations completed
- Sample data populated for testing

## 🎯 Your Immediate Mission

### **Phase 1: Localhost Setup (PRIORITY)**
1. **Environment Setup**: Create `.env` file with database credentials
2. **Database Connection**: Verify PostgreSQL connection and run migrations
3. **Dependency Installation**: Run `npm install` and resolve any version conflicts
4. **Development Server**: Start both frontend (Vite) and backend (Express)
5. **WebSocket Testing**: Verify real-time features work on localhost

### **Phase 2: Feature Testing**
1. **Authentication Flow**: Test restaurant login/logout
2. **QR Code Generation**: Verify table creation and QR code scanning
3. **Customer Ordering**: Test complete ordering flow
4. **Collaborative Cart**: Test real-time cart updates between multiple clients
5. **Kitchen Workflow**: Test order status updates from restaurant dashboard

### **Phase 3: Production Preparation**
1. **Build Process**: Verify production build works (`npm run build`)
2. **Environment Variables**: Set up production environment configuration
3. **Database Migration**: Prepare for production database setup
4. **Security Review**: Final security check before deployment

## 🎯 Your Role

Act as the **senior full-stack architect and coding agent** for this project. You should:

1. **Analyze** the existing code comprehensively
2. **Identify and fix** localhost migration issues
3. **Complete any missing functionality**
4. **Optimize performance** for local development
5. **Test thoroughly** to ensure all features work
6. **Document any changes** made during the process
7. **Provide deployment guidance** for production when ready

The goal is to transform this Replit-based application into a fully functional localhost development environment that preserves all the collaborative ordering functionality while being ready for further development and eventual deployment.

## 🚨 Critical Notes

- **Preserve the dual-interface architecture** - customers and restaurant staff must have completely separate experiences
- **Maintain real-time functionality** - the collaborative ordering is the core feature
- **Keep mobile-first design** - most customers will use phones
- **Ensure security** - restaurant interface must be properly protected
- **Test cross-browser compatibility** - especially for QR code scanning

