# Poker Equity Calculator

## Overview

This is a real-time poker equity calculator web application built with a modern full-stack architecture. The application allows users to calculate poker hand equity for different game variants (No Limit Hold'em, PLO4, and PLO5) using Monte Carlo simulation. It features an interactive poker table interface with card selection and real-time equity calculations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack TypeScript architecture with clear separation between client and server:

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (@tanstack/react-query) for server state management
- **UI Components**: Custom component library based on Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with custom poker-themed design tokens
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: REST API with JSON responses
- **Build Tool**: esbuild for server bundling

## Key Components

### Database Layer
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Database**: PostgreSQL (via Neon serverless)
- **Migrations**: Drizzle Kit for schema management
- **Storage**: PostgreSQL database with calculations table for persistent storage

### Shared Schema
- **Validation**: Zod schemas for type-safe data validation
- **Types**: Shared TypeScript types between client and server
- **Game Logic**: Card, hand, and game variant definitions

### Poker Engine
- **Monte Carlo Simulation**: Custom implementation for equity calculations
- **Hand Evaluation**: PokerStove-compatible hand evaluation for maximum accuracy
- **Game Variants**: Support for NLH, PLO4, and PLO5
- **PokerStove Integration**: Implemented PokerStove algorithms for professional-grade calculations

### UI Components
- **Card Selector**: Interactive card selection with visual feedback
- **Community Cards**: Board card management (flop, turn, river)
- **Player Hands**: Multi-player hand input with game variant support
- **Equity Display**: Real-time equity percentages and pot odds

## Data Flow

1. **Card Selection**: Users select cards through interactive UI components
2. **Validation**: Client-side validation using shared Zod schemas
3. **API Request**: Equity calculation requests sent to `/api/calculate-equity`
4. **Monte Carlo Calculation**: Server runs simulation with configurable iterations
5. **Real-time Updates**: Results displayed immediately with equity percentages
6. **Optional Persistence**: Calculations can be saved for future reference

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **@radix-ui/***: Accessible UI primitive components
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework
- **react**: Frontend framework
- **tailwindcss**: Utility-first CSS framework
- **typescript**: Type safety and development experience
- **vite**: Fast build tool and development server
- **wouter**: Lightweight routing library
- **zod**: Schema validation library

### Development Tools
- **@replit/vite-plugin-***: Replit-specific development enhancements
- **drizzle-kit**: Database schema management
- **esbuild**: Fast JavaScript bundler
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Type Checking**: Real-time TypeScript compilation
- **Database**: Development database with push-based schema updates
- **Process Management**: Single process running both client and server

### Production Build
- **Client Build**: Vite builds optimized React application to `dist/public`
- **Server Build**: esbuild bundles Express server to `dist/index.js`
- **Static Serving**: Express serves built client files in production
- **Database**: Production PostgreSQL database with migration-based updates

### Configuration
- **Environment Variables**: Database URL and environment-specific settings
- **Path Aliases**: TypeScript path mapping for clean imports
- **CSS Processing**: PostCSS with Tailwind CSS compilation
- **Asset Optimization**: Vite handles code splitting and asset optimization

The application is designed to be easily deployable on platforms like Replit, with the potential to add PostgreSQL database persistence by configuring the DATABASE_URL environment variable.