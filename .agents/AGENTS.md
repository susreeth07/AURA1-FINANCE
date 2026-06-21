# Aura Finance Project Rules

## Git & Release Quality Protocol

Before performing any Git commit or push, you MUST execute the following verification steps:
1. **Type Checks**: Run `node node_modules/typescript/bin/tsc --noEmit` and confirm 0 errors.
2. **Production Build**: Run `node node_modules/vite/bin/vite.js build` and confirm 0 warnings/errors.
3. **E2E Tests**: Run `node auth_audit_test.mjs` and confirm all Playwright tests pass.
4. **Regressions Guard**: Stop and fix any build or E2E failures before committing. Do not push unstable code.

## Credentials & Secrets Guard

* Never stage, commit, or push any secrets or ignored configuration variables.
* Never include keys in code changes, generated reports, screenshots, documentation, commits, or build logs.
* Exclude from Git staging:
  - `.env`
  - `.env.local`
  - `.env.production`
  - Raw Gemini API keys
  - Supabase service role keys
  - Session tokens or developer credentials
  - Temporary local debug logs

## Commit Message & Release Reporting Standards

1. **Commit Message Format**: Follow this pattern strictly:
   ```
   Sprint X - <Feature Name>
   ```
   *(Examples: "Sprint 2 - Gemini AI integration", "Sprint 3 - Premium UI redesign", "Sprint 4 - Authentication hardening")*

2. **Push Status Report**: Immediately after pushing to GitHub remote, output a summary containing:
   - Commit hash
   - Commit message
   - Branch name
   - GitHub push status
   - Vercel auto-redeploy status (yes/no)
   - Required Vercel environment variables to add manually (if any)
