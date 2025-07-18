# OnlyFans Automation Manager

See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for the complete project plan.
For step-by-step setup instructions, open [docs/instructions.html](docs/instructions.html) in your browser.

## Setup
1. Run `node start-here.js` from the repo root to create your Desktop folder, `.env` and encrypt API keys.
2. Place this project on your Desktop inside the folder you specified (e.g. `obo2`).
3. For automated setup, run `npm run setup` from that folder and follow the prompts.
4. Or perform the manual steps:
   - Copy `.env.example` to `.env` and edit `DATABASE_URL`.
   - Review required environment variables in docs/PROD_ENV.md
   - Run `npm run init-db` to create the database schema if needed.
   - Start the server with `npm start`.

## Development

Run `npm test` once to install dependencies and verify tests.
Then run `npm start` to launch the Express server.

### Database setup

Ensure PostgreSQL is running and `DATABASE_URL` is set. Initialise tables with:
```bash
npm run db:init
```

To run everything with Docker Compose:
```bash
docker-compose up --build
```

### Resetting the remote repo

If you need to push the current state of this project to a new Git remote, run
the helper script:

```bash
chmod +x push-reset.sh
./push-reset.sh <git_remote_url>
```

You must have valid Git credentials for the target repository.
=======
## Development

Run `npm test` once to install dependencies and verify tests.
Then run `npm start` to launch the Express server.

### Database setup

Ensure PostgreSQL is running and `DATABASE_URL` is set. Initialise tables with:
```bash
npm run db:init
```

To run everything with Docker Compose:
```bash
docker-compose up --build
```

### Resetting the remote repo

If you need to push the current state of this project to a new Git remote, run
the helper script:

```bash
chmod +x push-reset.sh
./push-reset.sh <git_remote_url>
```

You must have valid Git credentials for the target repository.
