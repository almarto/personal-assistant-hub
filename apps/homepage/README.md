# Homepage Application

The main dashboard application for the Personal Assistant Hub monorepo.

## Features

- **React + Vite**: Modern React application with Vite for fast development and optimized builds
- **TypeScript**: Full TypeScript support with strict type checking
- **React Router**: Client-side routing with nested routes for tools
- **CSS Modules**: Scoped styling with CSS Modules
- **Responsive Layout**: Header, sidebar navigation, and main content area
- **Tool Cards**: Dashboard with placeholder cards for future tools

## Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Top navigation bar
│   │   ├── Sidebar.tsx         # Side navigation menu
│   │   └── Layout.tsx          # Main layout wrapper
│   └── dashboard/
│       ├── DashboardGrid.tsx   # Grid layout for tool cards
│       └── ToolCard.tsx        # Individual tool card component
├── pages/
│   ├── Dashboard.tsx           # Main dashboard page
│   └── ComingSoon.tsx          # Placeholder for future tools
├── App.tsx                     # Main app component with routing
└── main.tsx                    # Application entry point
```

## Available Scripts

- `bun dev` - Start development server on port 3000
- `bun build` - Build for production
- `bun lint` - Run ESLint with flat config (ESLint v9)
- `bun check-types` - Run TypeScript type checking

## Navigation

The application includes navigation for:

- **Dashboard** (`/`) - Main landing page with tool overview
- **Baby Tracker** (`/baby-tracker`) - Coming soon
- **Gym Tracker** (`/gym-tracker`) - Coming soon
- **Moto Tracker** (`/moto-tracker`) - Coming soon

## Styling

Uses CSS Modules for component-scoped styling with:

- Consistent color scheme supporting dark/light modes
- Responsive grid layout for tool cards
- Hover effects and transitions
- Accessible focus states

## Requirements Fulfilled

This implementation satisfies the following requirements:

- **3.1**: Dashboard with navigation to tools ✅
- **3.2**: React + Vite with hot reload and optimized builds ✅
- **3.3**: React Router for navigation between sections ✅
- **3.4**: Main layout maintained with tool subroutes ✅
