# AI Template Studio

A template-based AI generation platform that allows users to create stunning images using various AI providers (Stable Diffusion, HuggingFace, ComfyUI, etc.) through a unified interface.

## 🌟 Features

- **Multi-Provider Support**: Generate images using Stable Diffusion, HuggingFace API, ComfyUI, and more.
- **Template System**: Use predefined templates with optimized prompts for different categories (Business, Cyberpunk, Fantasy, Anime).
- **Marketplace**: Buy and sell templates.
- **Real-time Generation**: Watch generation progress via WebSockets.
- **Credit System**: Subscription-based credit management for image generation.
- **Admin Dashboard**: Manage users, templates, and track system statistics.

## 🏗 Project Structure

The project is structured as a monorepo containing both the frontend and backend applications:

- `/frontend` - Next.js 15 application using Tailwind CSS and React 18.
- `/backend` - Express.js Node application using Prisma ORM, BullMQ for background jobs, and PostgreSQL.
- `/scripts` - Utility scripts for setup and deployment.

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js (v20+)
- Docker and Docker Compose
- `npm` or `yarn`

### 1. Environment Configuration

You need to set up environment variables for both the backend and frontend. We provide example files to get you started.

**Backend Configuration:**
```bash
cp backend/.env.example backend/.env
# Open backend/.env and configure your secrets (JWT, database, etc.)
```

**Frontend Configuration:**
```bash
cp frontend/.env.example frontend/.env.local
```

### 2. Run with Docker Compose (Recommended)

The easiest way to run the entire stack (Postgres, Redis, MinIO, Backend, Frontend) locally is using Docker Compose:

```bash
docker-compose up --build
```

This will automatically:
1. Start PostgreSQL, Redis, and MinIO.
2. Initialize the MinIO bucket.
3. Run database migrations and seed the database with initial templates.
4. Start the Backend API on `http://localhost:4000`.
5. Start the Frontend Next.js app on `http://localhost:3000`.

**Default Credentials:**
- Admin: `admin@aistudio.com` / `admin123`
- User: `user@aistudio.com` / `user123`

### 3. Run Manually (Without Docker)

If you prefer to run the Node applications manually (you still need Postgres and Redis running):

**Backend:**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run seed:prod
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📚 API Documentation

The backend exposes a REST API at `/api/*`. Key endpoints:
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate and receive JWT tokens
- `GET /api/templates` - Fetch available templates
- `POST /api/generations` - Start a new image generation task (requires auth)
- `GET /api/profile` - Get user profile and available credits

WebSocket connections are available at the root URL (e.g., `ws://localhost:4000`) for real-time generation updates.

## 🛠 Deployment

The project includes a `render.yaml` Blueprint for easy deployment to Render.com.

1. Connect your GitHub repository to Render.
2. Create a new Blueprint instance selecting the `render.yaml` file.
3. Render will provision PostgreSQL, Redis, and the Node web services automatically.

> Note: The free tier of Render uses local disk storage for generated images (`STORAGE_MODE=local`) instead of MinIO/S3.

## 🤝 Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, development workflow, and pull request process.
