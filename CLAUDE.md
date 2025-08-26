# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
ZDT Point of Sale System - A comprehensive Electron-based POS application with web dashboard, integrating Stripe payments, Shopify sync, and thermal printer support.

## Development Commands

### Quick Start
```bash
# Full development with dashboard rebuild
yarn start

# Quick start without dashboard rebuild  
yarn quickstart

# Dashboard development with hot reload (server + client)
cd posdashboard && yarn start-all

# Dashboard server development only
cd posdashboard && yarn start-dev

# Dashboard client development only  
cd posdashboard && yarn client-local
```

### Build & Package
```bash
# Complete build and packaging (Electron)
yarn makeall

# TypeScript compilation only (Electron app)
yarn build

# Dashboard server compilation
cd posdashboard && yarn build-server

# Dashboard client production build  
cd posdashboard && yarn build-client

# Dashboard complete build (server + client)
cd posdashboard && yarn build
```

### Testing
```bash
# Run server tests
yarn test

# Dashboard tests
cd posdashboard && yarn test

# Dashboard TypeScript checking
cd posdashboard && yarn tsc --noEmit
```

## Architecture

### Three-Tier System
1. **Electron Desktop App** (`main.tsx`): POS terminal handling transactions, printer integration, local data storage
2. **Express Server** (`posdashboard/index.tsx`): REST APIs, Socket.IO real-time updates, Shopify/Stripe integration, PostgreSQL database  
3. **React Dashboard** (`posdashboard/client/src/`): Web-based management interface for reporting, configuration, inventory management

### Key Integration Points
- **Stripe**: Payment processing via `stripeConnect.ts` - handles terminal operations and checkout sessions
- **Shopify**: Product/order sync through `shopify.ts` using Admin API
- **Database**: PostgreSQL via `database.ts` - orders, products, customers, transactions
- **Printing**: Thermal printer support in `printerInterface.ts` using escpos library
- **Google Drive**: Photo storage integration for product images

### Critical Data Flows
- **Transaction Processing**: POS UI → Electron IPC → Server API → Stripe/Database
- **Inventory Sync**: Shopify Webhooks → Server → Database → POS Updates via Socket.IO
- **Receipt Printing**: Transaction Complete → Format Receipt → Printer Queue → Thermal Output

## Environment Configuration

### Required Environment Variables
```
DATABASE_URL=postgresql://user:pass@host/dbname
STRIPE_SECRET_KEY=sk_live_xxx
SHOPIFY_ACCESS_TOKEN=shpat_xxx  
SHOPIFY_WEBHOOK_SECRET=xxx
GOOGLE_DRIVE_API_KEY=xxx
```

### Development Setup
1. Install PostgreSQL and create database
2. Copy `.env.example` to `.env` and configure
3. Install dependencies: `yarn install` (root and `cd posdashboard && yarn install`)
4. For dashboard client: `cd posdashboard/client && yarn install`

## Code Patterns

### API Endpoints
All dashboard APIs follow pattern: `/api/[resource]/[action]`
Example: `/api/orders/list`, `/api/products/update`

### Socket.IO Events
Real-time updates use typed events:
- `order:created`, `order:updated`
- `product:updated`, `inventory:changed`
- `payment:processed`, `refund:completed`

### Error Handling
Consistent error response format:
```typescript
{ success: false, error: string, details?: any }
```

## Database Schema
Main tables: orders, order_items, products, customers, transactions, users, stores, discounts, gift_cards

## Security Notes
- Stripe keys in environment variables only
- Session-based auth for dashboard
- Electron context isolation enabled
- API rate limiting on public endpoints