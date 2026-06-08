# Contributing to AI Template Studio

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:
- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Workflow

1. **Fork the repo** and create your branch from `main`.
2. **Install dependencies** in both `frontend/` and `backend/` directories.
3. **Run local services** using `docker-compose up` to ensure Postgres and Redis are available.
4. **Make your changes**. 
5. **Format and Lint**: Run `npm run lint` in both frontend and backend directories.
6. **Test**: Run `npm test` to ensure your changes haven't broken any existing functionality. Add new tests for new features.
7. **Commit**: Use conventional commits (e.g., `feat: add new provider`, `fix: correct typo in generation queue`).

## Pull Requests

1. Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations, and container parameters.
2. The PR will trigger our GitHub Actions CI pipeline, which checks:
   - Type-checking (`tsc --noEmit`)
   - Linting (`eslint`)
   - Testing (`jest` / `vitest`)
3. Ensure all CI checks pass. If tests fail, your PR will not be merged.
4. You may merge the Pull Request once you have the sign-off of at least one other developer.

## Issue Reporting

- Use a clear and descriptive title.
- Describe the exact steps to reproduce the problem.
- Provide specific examples to demonstrate the steps.
- Describe the behavior you observed after following the steps and point out what exactly is the problem with that behavior.
- Explain which behavior you expected to see instead and why.

## Coding Style

- Use TypeScript for all new code. Avoid using `any`.
- Backend uses Express.js. Keep routes thin and move business logic into the `/services` folder.
- Frontend uses Next.js 15 App Router. Prefer Server Components where state/interactivity is not needed.
- Use Tailwind CSS for styling. Avoid writing custom CSS classes in `globals.css` unless absolutely necessary.
