# ZDT Point of Sale System

A comprehensive Electron-based point-of-sale application with web dashboard, integrating Stripe payments, Shopify sync, and thermal printer support.

## Project Overview

This is a three-tier POS system designed for restaurants/retail with advanced features:

- **Electron Desktop App**: POS terminal for transactions, printer integration, local data
- **Express Web Server**: REST APIs, real-time updates, payment processing, integrations  
- **React Dashboard**: Web-based management interface for reporting and configuration

## Quick Start

### Development with Hot Reload
```bash
# Full development with dashboard rebuild
yarn start

# Quick start without dashboard rebuild  
yarn quickstart

# Dashboard development with hot reload (server + client)
cd posdashboard && yarn start-all
```

### Production Build & Package
```bash
# Complete build and packaging (Electron)
yarn makeall

# TypeScript compilation only (Electron app)
yarn build
```

## Installation & Setup

### Prerequisites
- Node.js 18.16.1
- PostgreSQL database
- Yarn package manager

### Installation Steps
1. **Install dependencies:**
   ```bash
   yarn install
   cd posdashboard && yarn install
   cd client && yarn install
   ```

2. **Database Setup:**
   - Install PostgreSQL and create database
   - Copy `.env.example` to `.env` and configure

3. **Environment Variables:**
   Copy `.env.example` to `.env` and configure:
   ```env
   # Database Configuration
   DB_HOST=your_database_host
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_PORT=5432
   DB_HOST_BACKUP=backup_host_optional
   DB_PORT_BACKUP=5432

   # Stripe Payment Processing
   STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
   STRIPE_ENDPOINT_SECRET=whsec_your_webhook_secret

   # Shopify Integration
   SHOPIFY_API_KEY=your_shopify_api_key
   SHOPIFY_PASSWORD=shppa_your_private_app_password
   SHOPIFY_TOKEN=shppa_your_access_token
   SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
   SHOP_NAME=your-shop-name

   # Security & Authentication
   JWT_SECRET=your_jwt_secret_min_32_chars
   SEAL_SECRET=seal_secret_session_encryption_key
   SEAL_TOKEN=seal_token_session_token_key

   # Application Configuration
   NODE_ENV=development
   PORT=8080
   ELECTRON_PORT=8901
   ```

## Architecture

### System Components
1. **Electron App** (`main.tsx`): Desktop POS terminal
2. **Express Server** (`posdashboard/index.tsx`): API server with Socket.IO
3. **React Client** (`posdashboard/client/src/`): Web dashboard interface

### Key Integrations
- **Stripe**: Payment processing and terminal operations
- **Shopify**: Product/order sync via Admin API
- **PostgreSQL**: Orders, products, customers, transactions
- **Thermal Printing**: Receipt printing via escpos library
- **Google Drive**: Photo storage for products/members

### Data Flow
- **Transactions**: POS UI → Electron IPC → Server API → Stripe/Database
- **Inventory**: Shopify Webhooks → Server → Database → POS via Socket.IO
- **Receipts**: Transaction → Format → Printer Queue → Thermal Output

## Available Scripts

### Development
```bash
yarn start          # Full development with dashboard rebuild
yarn quickstart     # Quick start without dashboard rebuild
yarn startall       # Concurrent development (dashboard + electron)
```

### Building
```bash
yarn build          # TypeScript compilation (Electron)
yarn makeall        # Complete build and packaging
yarn make           # Alternative make command
yarn package        # Package without make
```

### Testing
```bash
yarn test           # Run tests (currently placeholder)
```

## Features

### Core POS Features
- Multi-position support (Front, Kitchen, Manager)
- Real-time order management with Kitchen Display System (KDS)
- Integrated payment processing (Stripe terminals)
- Thermal receipt printing
- Party and group booking system
- Employee time tracking and management
- Gift card processing and management

### Management Features
- Daily and register reporting
- Member database with photo storage
- Employee hour tracking
- Real-time sales monitoring
- Device access control
- Multi-role permission system

### Technical Features
- Offline-capable Electron app
- Real-time updates via Socket.IO
- Shopify product synchronization  
- Stripe webhook handling
- PostgreSQL with parameterized queries
- Session-based authentication
- Cross-platform packaging (Windows, macOS)

## Database Schema

Main tables: `orders`, `order_items`, `products`, `customers`, `transactions`, `users`, `stores`, `discounts`, `gift_cards`, `employees`, `member_visits`

## Security

- Environment variables for all secrets
- Session-based authentication
- SQL injection prevention via parameterized queries
- Electron context isolation enabled
- API rate limiting on public endpoints
- CORS configured for trusted origins

## Development Notes

- Uses Yarn 4 with modern package management
- TypeScript throughout codebase
- Material-UI for dashboard components
- Electron Forge for packaging
- Socket.IO for real-time communication
- React 18 with modern hooks patterns

## Support

For development guidance, see `CLAUDE.md` in the project root and `posdashboard/CLAUDE.md` for dashboard-specific information.