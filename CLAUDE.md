# CLAUDE.md — Receipt Split App

This file provides guidance for AI assistants (Claude Code and similar tools) working on this repository.

## Project Overview

**receipt-split-app** is an application for splitting receipts and expenses among groups of people. Users can upload receipts, assign items to individuals, and calculate how much each person owes.

> **Status**: Early-stage / greenfield project. No implementation exists yet. This file documents intended conventions and structure for when development begins.

## Repository State

- Single branch: `master` (remote origin)
- Only file present: `README.md`
- No package manager, framework, or tooling configured yet

## Development Conventions

### Branch Naming

- Feature branches: `feature/<short-description>`
- Bug fix branches: `fix/<short-description>`
- Claude-generated branches follow: `claude/<session-id>`

### Commit Messages

Use conventional commits format:
```
<type>(<scope>): <short description>

[optional body]
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`

Examples:
- `feat(receipts): add item-level splitting logic`
- `fix(auth): correct token expiry handling`
- `docs: update setup instructions`

### Code Style

When code is added, follow these defaults unless a config file specifies otherwise:
- **Language**: TypeScript preferred
- **Formatting**: 2-space indentation, single quotes, trailing commas
- **Naming**: camelCase for variables/functions, PascalCase for classes/components/types
- **Files**: kebab-case file names (e.g., `receipt-parser.ts`, `split-calculator.ts`)

## Intended Architecture (Planned)

The following is the expected project structure once development begins:

```
receipt-split-app/
├── src/
│   ├── components/       # UI components (if frontend exists)
│   ├── pages/ or routes/ # Page-level components or API routes
│   ├── lib/              # Shared utilities and business logic
│   ├── models/           # Data models / database schemas
│   └── types/            # TypeScript type definitions
├── tests/                # Test files mirroring src/ structure
├── public/               # Static assets
├── package.json
├── tsconfig.json
├── README.md
└── CLAUDE.md
```

## Key Domain Concepts

When implementing features, keep these core concepts in mind:

- **Receipt**: A scanned or manually entered bill containing line items with prices
- **Item**: A single line on a receipt (name + price)
- **Participant**: A person involved in the split
- **Split**: The assignment of items or proportional shares to participants
- **Settlement**: The calculated amount each participant owes or is owed

## Development Workflow

Since no tooling is set up yet, when setting up the project:

1. Initialize with a package manager (`npm`, `pnpm`, or `yarn`)
2. Add TypeScript and configure `tsconfig.json`
3. Add a linter (`eslint`) and formatter (`prettier`)
4. Add a test runner (`vitest` or `jest`)
5. Set up a framework (Next.js, Remix, or Express + React)
6. Update this file with actual scripts and commands

Once tooling is configured, the standard workflow will be:

```bash
# Install dependencies
npm install          # or pnpm install / yarn

# Run development server
npm run dev

# Run tests
npm test             # or npm run test:watch

# Lint and format
npm run lint
npm run format

# Build for production
npm run build
```

## AI Assistant Guidelines

### When Asked to Implement Features

1. **Check this file first** for conventions and structure
2. **Read existing files** before modifying them
3. **Follow the domain model** — use the terminology defined above
4. **Write tests** alongside implementation code
5. **Keep commits focused** — one logical change per commit

### What to Avoid

- Do not add unnecessary abstractions or over-engineer solutions
- Do not add features beyond what is explicitly requested
- Do not commit `.env` files or secrets
- Do not modify `master` directly — always use a feature branch

### Environment Variables

When `.env` support is added, document all variables in `.env.example`. Never commit real secrets. Expected variables will include things like:

```
DATABASE_URL=
AUTH_SECRET=
STORAGE_BUCKET=
```

## Contributing

Until formal contribution guidelines are added:

1. Create a branch from `master`
2. Make focused, well-described commits
3. Ensure tests pass before pushing
4. Open a pull request with a clear description of changes
