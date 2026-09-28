# Agent Rules

## Environment Files

`.env` is protected and must NEVER be modified automatically.

Never:
- overwrite `.env`
- regenerate `.env`
- copy `.env.example` to `.env`
- replace real credentials with placeholders
- change database URLs
- change API keys
- change provider configuration

`.env.example` is also protected unless an environment variable is genuinely required by the implementation.

If a new environment variable is required:
1. Add only a placeholder to `.env.example`.
2. Do not modify `.env`.
3. Tell the developer which value must be added manually.

Never expose secrets in source code, logs, commits, documentation, or chat output.

Before completing a task, verify that `.env` has not been modified.
