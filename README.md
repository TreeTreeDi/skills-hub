# skills-hub

AI Agent 技能发现与安装平台

## Development

- Check everything is ready:

```bash
vp run ready
```

- Run the tests:

```bash
vp run -r test
```

- Build the monorepo:

```bash
vp run -r build
```

- Run the development server:

```bash
vp run dev
```

## Website Sync And Deploy

- The website prefers `skills/` in the current repo, otherwise reads the configured GitHub skills repo via `GITHUB_OWNER` and `GITHUB_REPO`, and only falls back to `.agents/skills` for local development.
- GitHub Actions runs lint, type checks, tests, and build on every PR and on pushes to `main`.
- After a successful push to `main`, Actions calls the Vercel deploy hook stored in `VERCEL_DEPLOY_HOOK_URL`.

## Required Secrets

- Website runtime needs:
  `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`
- GitHub Actions deployment needs:
  `VERCEL_DEPLOY_HOOK_URL`

### Local Website Env

- Copy `apps/website/.env.example` to `apps/website/.env.local`
- Fill in:
  - `GITHUB_TOKEN`: a GitHub PAT with read access to the target skills repo
  - `GITHUB_OWNER`: repo owner, default `TreeTreeDi`
  - `GITHUB_REPO`: repo name, default `skills-data`

### GitHub Actions Secret

- Add repo secret `VERCEL_DEPLOY_HOOK_URL`

### Vercel Project Env

- Add these environment variables to the website project:
  - `GITHUB_TOKEN`
  - `GITHUB_OWNER`
  - `GITHUB_REPO`
