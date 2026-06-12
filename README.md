# Social Media Scheduler

A full-stack social media scheduling application with a React + TypeScript frontend and an Express + MongoDB backend.

## Overview

This project includes:

- `client/` — React + Vite + TypeScript frontend
- `server/` — Express.js + TypeScript backend API
- Social account management via Zernio OAuth
- Post scheduling and publishing automation
- AI-powered content generation with Gemini + Hugging Face image generation
- File uploads via Cloudinary

## What’s Included

### Frontend

- Pages: `Home`, `Login`, `Dashboard`, `Accounts`, `Scheduler`, `AIComposer`
- Shared layout components: `Layout`, `Sidebar`, `PlatformPickerModal`, `AccountList`
- Authentication state management with `AuthContext`
- API integration using Axios and protected routes
- Responsive UI built with Tailwind CSS

### Backend

- User auth: register + login with JWT
- Account sync: connect social platforms via Zernio and sync account metadata
- Post management: schedule, store, and publish posts
- AI generation: create post content and optional images
- Scheduler service: runs every minute with `node-cron` to publish due posts
- Cloudinary upload support for generated and user media

## Tech Stack

- Frontend:
  - React 19
  - TypeScript 6
  - Vite 4
  - Tailwind CSS 4
  - React Router DOM 7
  - Lucide icons
  - react-hot-toast

- Backend:
  - Node.js + Express 5
  - TypeScript 6
  - Mongoose
  - JWT auth
  - Zernio integration
  - Google Gemini API
  - Hugging Face inference
  - Cloudinary
  - node-cron

## Setup

### Prerequisites

- Node.js 20+ (or compatible with installed packages)
- npm
- MongoDB instance
- `.env` file in `server/` with values for:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - `GEMINI_API_KEY`
  - `HUGGINGFACE_API_KEY`

### Run locally

From project root:

```bash
cd server
npm install
npm run start
```

In another terminal:

```bash
cd client
npm install
npm run dev
```

### Build

```bash
cd client
npm run build
```

```bash
cd server
npm run build
```

## API Endpoints

- `POST /api/auth/register` — register user
- `POST /api/auth/login` — login user
- `GET /api/oauth/:platform/url` — get Zernio auth URL
- `GET /api/oauth/sync` — sync connected accounts
- `GET /api/accounts` — list user accounts
- `DELETE /api/accounts/:id` — disconnect account
- `GET /api/posts` — list posts
- `POST /api/posts` — schedule a post
- `POST /api/posts/generate` — generate AI content
- `GET /api/posts/generations` — list generated content
- `GET /api/activity` — recent activity feed

## Notes

- The frontend currently handles authenticated navigation and scheduling flows.
- The backend includes a scheduler service that publishes due posts automatically.
- OAuth and content generation require valid Zernio, Gemini, Cloudinary, and HuggingFace or other image generations    credentials.
- Some UI and backend code uses `any`; consider replacing with stricter TypeScript types for production readiness.

## Improvements

Potential next steps:

- Add loading/error handling in more components
- Improve type safety across API payloads
- Add tests for backend routes and frontend pages
- Add role-based access or multi-user support
- Add deployment instructions for Vercel/Netlify and a hosted backend
