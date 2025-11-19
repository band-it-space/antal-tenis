# Antal Tenis Scrapers

## Project Overview

The `antal-tenis` project powers a small Express API (see `api/src/index.js`) that orchestrates country-specific tennis club scrapers. Each scraper (for example `api/src/scrappers/germany.js`, `england.js`, `switzerland.js`) collects club metadata, normalizes it, and persists it through Prisma into a PostgreSQL database (`api/prisma/schema.prisma`). A `/api/scrapers` endpoint (`api/src/routes/scrappers.js`) accepts a `country` payload and launches the corresponding scraper, making it easy to kick off data refreshes programmatically or from an operations console.

Key pieces:

-   Node.js/Express server (`api/src/index.js`) with a simple `/health` probe
-   Scraper controller (`api/src/controllers/scrappers.js`) dispatching to the per-country scrapers
-   Prisma ORM setup (`api/src/prisma.js`, `api/prisma/schema.prisma`) targeting PostgreSQL and tracking tennis clubs plus their locations
-   Helper utilities (`api/src/helpers/index.js`) for resilient HTTP requests and Prisma uniqueness checks
-   Optional Docker Compose workflow (`docker-compose.yml`) that spins up PostgreSQL and the API together

## Setup

1. **Install prerequisites**

    - Node.js 18+ and npm
    - PostgreSQL 16+ (or use the provided Docker Compose stack)

2. **Clone and install dependencies**

    ```bash
    git clone <repo-url>
    cd antal-tenis/api
    npm install
    ```

3. **Configure environment**

    - Create `.env` in the repo root (or `api/.env`) with at least:
        ```
        DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public"
        POSTGRES_USER=postgres
        POSTGRES_PASSWORD=postgres
        POSTGRES_DB=antal_tenis
        ```
    - Adjust credentials/hostnames as needed.

4. **Run database migrations**

    ```bash
    npx prisma migrate deploy
    ```

5. **Start the API**

    - Local: `npm run dev` (defaults to port 3000; `/health` confirms readiness).
    - Docker: from the repo root run `docker-compose up --build` to launch PostgreSQL and the API (exposes ports `8080` for HTTP and `5555` for Prisma Studio if you enable it).

6. **Trigger a scraper**
    ```bash
    curl -X POST http://localhost:3000/api/scrapers \
      -H "Content-Type: application/json" \
      -d '{"country":"germany"}'
    ```
    Replace the country with `england` or `switzerland` to run other scrapers.

> Tip: All scraper output ultimately lands in the `clubs` and `club_locations` tables defined in `api/prisma/schema.prisma`. Use Prisma Studio (`npx prisma studio`) or any Postgres client to inspect the data after a run.

## Docker Workflow

1. **Build and start services**

    ```bash
    cd antal-tenis
    docker-compose up --build
    ```

    This launches PostgreSQL and the API containers defined in `docker-compose.yml`. The API listens on `http://localhost:8080`.

2. **Apply Prisma migrations inside the API container (first run only)**

    ```bash
    docker-compose exec api npx prisma migrate deploy
    ```

3. **Seed or run scrapers**

    - Use `curl` against `http://localhost:8080/api/scrapers` from your host machine, same as the local flow.
    - Alternatively exec into the container to run scripts:
        ```bash
        docker-compose exec api npm run dev
        ```

4. **Shut down**
    ```bash
    docker-compose down
    ```
    Add `-v` to remove the named volumes if you want a clean Postgres state.
