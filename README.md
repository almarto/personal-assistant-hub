# Personal Assistant Hub

![License](https://img.shields.io/badge/license-Private-red.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)

A modular, multipurpose personal assistant platform built with Next.js, TypeScript, and TailwindCSS.

## 🚀 Project Overview

Personal Assistant Hub is a self-hosted, modular application designed to centralize various personal tracking and assistance tools. The project aims to provide a unified interface for multiple life management modules while maintaining the ability to extract any module into a standalone application if needed.

### 📋 Core Modules

- **🏋️ Gym Workout Tracker**: AI-powered workout configuration and evolution to help you achieve your fitness goals
- **👶 Baby Food Tracker**: Track food introductions, reactions, and preferences for your child
- **🤖 Personal Assistant**: Calendar/notes integration with AI capabilities to manage your schedule and tasks
- **🏍️ Motorbike Repair Tool**: Photo documentation for disassembly/reassembly of motorcycle parts
- **➕ Extensible Architecture**: Easily add new modules as needs arise

## 🛠️ Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript 5+
- **UI**: TailwindCSS + Shadcn/UI components
- **Authentication**: Auth.js (formerly NextAuth.js)
- **Database**: Drizzle ORM with PostgreSQL
- **State Management**: React Query + Zustand
- **Monorepo Management**: Turborepo
- **AI Integration**: OpenAI SDK / Anthropic SDK

## 📁 Project Structure

This project uses a Turborepo monorepo structure:

```
personal-assistant-hub/
├── apps/
│   └── web/                  # Main web application (dashboard)
├── packages/
│   ├── ui/                   # Shared UI components
│   ├── auth/                 # Authentication logic
│   ├── database/             # Database schema and utilities
│   ├── config/               # Shared configuration
│   ├── ai/                   # AI integration utilities
│   ├── api/                  # API utilities and types
│   └── utils/                # Shared utility functions
├── turbo.json                # Turborepo configuration
└── package.json              # Root package.json
```

Module-specific code is organized as follows:
- Module-specific UI components: `packages/ui/[module-name]/`
- Module-specific business logic: `packages/[module-name]/`
- Module routes/pages: `apps/web/src/app/(dashboard)/dashboard/[module-name]/`

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm (recommended) or npm/yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/personal-assistant-hub.git
cd personal-assistant-hub
```

2. Install dependencies

```bash
pnpm install
```

3. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your database credentials and other settings
```

4. Run database migrations

```bash
pnpm db:migrate
```

5. Start the development server

```bash
pnpm dev
```

## 🧩 Development

### Build

To build all apps and packages:

```bash
pnpm build
```

To build a specific package:

```bash
pnpm build --filter=web
```

### Development Server

To run the development server for all apps:

```bash
pnpm dev
```

To run a specific app:

```bash
pnpm dev --filter=web
```

## 🔒 Self-Hosting

This application is designed to be self-hosted on your local network with optional internet access via Cloudflare Tunnel. See the [DEPLOYMENT.md](./DEPLOYMENT.md) file for detailed instructions.

## 📚 Documentation

For more detailed information about the project architecture and implementation details, see the [ARCHITECTURE.md](./ARCHITECTURE.md) file.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is private and proprietary. All rights reserved.

