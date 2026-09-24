# Playwright Page Object Generator
## Project
Build a TypeScript/Node.js CLI that converts HTML snippets or local HTML files into valid, formatted Playwright Page Object classes.
Keep the implementation simple and limited to the requested scope.
## Stack
- TypeScript
- Node.js
- npm
- jsdom
- dom-accessibility-api
- commander
- prettier
- vitest
- @playwright/test
Do not add, remove, or upgrade dependencies unless explicitly requested.
## Rules
- Use strict TypeScript.
- Keep HTML parsing, locator selection, code generation, and CLI handling separate.
- Prefer Playwright semantic locators and stable test IDs.
- Use CSS only as a fallback. Do not generate XPath.
- Do not add a UI, server, database, Docker, browser scraping, or external AI services unless explicitly requested.
- Change only files required for the current task. Do not refactor unrelated code.
## Safety
- Work only inside this repository.
- Do not delete files or discard existing Git changes unless explicitly requested.
- Never run rm -rf, git clean, git reset --hard, or force-push.
- Do not modify CLAUDE.md or .claude/ configuration unless explicitly requested.
- Do not commit or push unless explicitly requested.
