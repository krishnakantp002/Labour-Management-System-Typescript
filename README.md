# Labour Management & Daily Wage System

A workforce management application for small businesses — warehouses, transport companies, cold storages, rice mills, cement depots, fertilizer godowns, and loading/unloading contractors.

Workers are paid **daily wages based on quantity of work** (tons loaded/unloaded), not fixed salaries.

## Tech Stack

- **Frontend**: React, Tailwind CSS, React Query
- **Backend**: Node.js, Express.js, TypeScript, Prisma
- **Database**: PostgreSQL
- **Auth**: JWT + Bcrypt

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 15

### Server Setup

```bash
cd server
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

### Client Setup

```bash
cd client
npm install
npm run dev
```

## Project Structure

```
├── client/          # React frontend
├── server/          # Express backend
│   ├── prisma/      # Database schema & migrations
│   └── src/
│       ├── config/
│       ├── middleware/
│       ├── modules/
│       └── utils/
└── README.md
```

## License

Private - All rights reserved.
