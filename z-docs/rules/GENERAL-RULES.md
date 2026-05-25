# General Project Rules

Top-level rules that apply across the entire BrainFlex project regardless of which layer (frontend, backend, infra) you're working in.

1.  **Consistency:** Maintain consistent naming, formatting, and architectural patterns throughout the codebase.
2.  **Documentation:** Keep `README.md`, `AGENTS.md`, `GEMINI.md`, and the rule docs under `z-docs/rules/` up-to-date with significant project changes.
3.  **Environment Variables:** Manage all sensitive data (API keys, connection strings) via the `.env` file at the project root.
4.  **Docker Compose:** Always use `docker compose up -d` for infrastructure services (MongoDB, Redis). Do not rely on Spring Boot's auto-start.
5.  **Git Practices:** Use clear, concise commit messages, focusing on the _why_. Follow conventional commit guidelines.
6.  **DO NOT TAKE SHORTCUTS:** Always follow the established rules and conventions. Do not bypass testing, documentation, or code review processes for expediency. Quality and maintainability are paramount.
