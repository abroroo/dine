# Overview

This is a modern restaurant ordering system built with a TypeScript full-stack architecture. The application enables customers to scan QR codes at restaurant tables to access menus and place collaborative orders, while providing restaurant owners with a real-time kitchen management dashboard. The system supports multi-user ordering sessions where multiple customers at the same table can contribute to a shared cart, and restaurant staff can track and update order statuses in real-time.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built with React and TypeScript using Vite as the build tool. The application uses a component-based architecture with shadcn/ui components for consistent design. Key architectural decisions include:

- **State Management**: TanStack Query for server state management with optimistic updates and caching
- **Routing**: Wouter for lightweight client-side routing with authentication-based route protection
- **Styling**: Tailwind CSS with CSS custom properties for theming and shadcn/ui components
- **Real-time Communication**: WebSocket integration for live order updates and collaborative cart synchronization

## Backend Architecture
The server-side uses Express.js with TypeScript in ESM format. The architecture follows REST API principles with real-time WebSocket support:

- **API Design**: RESTful endpoints organized by feature (restaurants, tables, menu items, orders)
- **Authentication**: Replit OAuth integration with session-based authentication using express-session
- **Database Layer**: Drizzle ORM with typed schema definitions for type-safe database operations
- **Real-time Features**: WebSocket server for broadcasting order updates and cart synchronization

## Data Storage Solutions
The application uses PostgreSQL as the primary database with the following design decisions:

- **ORM**: Drizzle ORM chosen for type safety and excellent TypeScript integration
- **Schema Management**: Centralized schema definitions in shared directory for type consistency
- **Session Storage**: PostgreSQL-backed session storage using connect-pg-simple
- **Database Provider**: Neon serverless PostgreSQL for scalability and connection pooling

## Authentication and Authorization
Authentication is handled through Replit's OAuth system with the following implementation:

- **Authentication Provider**: OpenID Connect with Replit as the identity provider
- **Session Management**: Secure HTTP-only cookies with PostgreSQL session storage
- **Authorization**: Route-level protection with user context injection
- **User Management**: Automatic user creation and profile synchronization on login

# External Dependencies

## Database and ORM
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations with schema validation
- **Drizzle Kit**: Database migrations and schema management

## Authentication Services
- **Replit OAuth**: OpenID Connect authentication provider
- **Passport.js**: Authentication middleware for Express.js
- **express-session**: Session management with PostgreSQL storage

## UI and Styling
- **shadcn/ui**: Pre-built accessible UI components with Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Radix UI**: Headless component primitives for accessibility

## Real-time Communication
- **WebSocket (ws)**: Native WebSocket implementation for real-time features
- **TanStack Query**: Client-side state management with real-time synchronization

## Development and Build Tools
- **Vite**: Fast development server and build tool for the frontend
- **TypeScript**: Type safety across the entire application stack
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Development Plugins**: Cartographer and dev banner for enhanced development experience