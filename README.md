## Pet Care Log

A minimal CRUD dashboard for tracking pet feedings, walks, medication, or vet visits. Built with Next.js (App Router), TypeScript, Tailwind CSS, and a MySQL database accessed via the `mysql2` driver—ready to deploy on Vercel.

## Tech Stack

- Next.js 15 (App Router) + React + TypeScript
- Tailwind CSS for styling
- MySQL storage (via `mysql2/promise`)

## Local Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   - Copy `env.example` to `.env.local`
   - Update `DATABASE_URL` with your MySQL connection string, e.g.
     ```
     mysql://user:password@host:3306/pet_care_log
     ```

3. **Create the database table**

   ```bash
   mysql -u user -p pet_care_log < db/schema.sql
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push this project to GitHub/GitLab/Bitbucket.
2. Create a new Vercel project and import the repo.
3. Set `DATABASE_URL` in the Vercel dashboard under *Settings → Environment Variables*.
4. Deploy—Vercel will handle building the Next.js app and host the edge/serverless routes that talk to MySQL.

> **Tip:** Use a managed MySQL provider (PlanetScale, Neon, AWS RDS, etc.) so your database is reachable from Vercel’s infrastructure.
