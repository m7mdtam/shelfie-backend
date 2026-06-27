# Shelfie — Backend

The API and admin behind **Shelfie**, a community book-tracking app where people build a shelf, rate and comment on books, and browse what others are reading. This repo is the backend: a headless content layer plus a typed API that the React frontend consumes.

## What it provides

- **Books, Ratings, Comments, Users, and Media** as modelled collections
- A **REST API** for the app: list and create books, a personal shelf (`/api/books/me`), per-book ratings and comments, and the current user (`/api/users/me`)
- A **GraphQL** endpoint and playground over the same data
- **Auth** (email/password) and an admin panel for managing content
- Image uploads handled outside the app and served from blob storage

## Stack

- **Payload CMS 3** on **Next.js 15** (App Router)
- **PostgreSQL** via Payload's Postgres adapter
- **Vercel Blob** for media storage, **Resend** for transactional email
- **Lexical** rich-text editor for long-form fields
- **Playwright** (e2e) and **Vitest** (integration) tests
- **Docker** / docker-compose for local infra

## How it's organised

- `src/collections/` — `Books`, `Ratings`, `Comments`, `Users`, `Media`: the data model, access control, and hooks
- `src/app/api/` — the app-facing REST endpoints (books, ratings, comments, me) built on Payload's local API
- `src/app/(payload)/` — the generated admin panel, GraphQL, and Payload routes
- `src/payload.config.ts` — collections, database, storage, email, and CORS in one place
- `tests/` — `e2e/` Playwright specs and `int/` API integration specs

## Design notes

- **Two API surfaces, one source of truth.** Payload generates a full REST + GraphQL API and admin UI from the collections; the hand-written endpoints in `src/app/api` sit on top for the exact shapes the frontend needs — a user's own shelf, a book's rating summary — so the client gets a focused API without giving up the admin and GraphQL that come for free.
- **Config-first.** Database, storage, email, and CORS are all wired in `payload.config.ts`, so changing a provider or environment is a config change rather than a refactor.

## Run it locally

```bash
pnpm install
cp .env.example .env   # set DATABASE_URL, PAYLOAD_SECRET, etc.
pnpm dev
```

Open the admin at `/admin` to create the first user. Run the tests with:

```bash
pnpm test        # integration + e2e
pnpm test:int    # Vitest integration only
```
