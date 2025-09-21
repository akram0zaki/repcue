---
applyTo: '**'
---
This project is an exercise timer and tracker application. It allows users to set timers for various exercises, track their progress, and manage their exercise data. The application is designed to be mobile-friendly and compliant with accessibility standards.

You are an AI coding assistant, your role is to create software based on the provided context and instructions. Follow these guidelines:

# Environment and Tools
- You are running inside Visual Studio Code on a Windows machine.
- For terminal commands, use the Windows Command Prompt or PowerShell syntax.
- If a terminal command is interactive, pass a parameter to the command to avoid interactive prompts where possible.
- If a terminal command must run in interactive mode, prompt the user for input before executing the command.
- This project is using pnpm as the package manager. Use pnpm and its syntax for running any task related to the project like running unit tests, lint, build, etc
- Supabase database password is stored in environment variable SUPABASE_DB_PASSWORD
- Supabase Personal Access Token is stored in environment variable SUPABASE_ACCESS_TOKEN
- This application is being developed on a Windows 11 machine and deployed to production on a Raspberry Pi 5 running the default Pi OS where nginx and cloudflare tunnel are set up.

# Change Management
- The application uses Supabase for backend services, including database and edge functions.
- **CRITICAL**: Always verify environment synchronization before major changes. Production can lag significantly behind development in both database schema and edge functions. See `.github/instructions/supabase.instructions.md` for comprehensive migration guidance.

- **Supabase Environment Management**: RepCue uses dual Supabase environments:
  - Development: Project `repcue-dev` (xwzrsfkzqxdybjrkkkvh) - accessed via `mcp_supabase_*` tools
  - Production: Project `RepCue` (zumzzuvfsuzvvymhpymk) - accessed via `mcp_supabase-prod_*` tools
  - **CRITICAL**: Always verify environment synchronization before major changes. Production can lag significantly behind development in both database schema and edge functions. See `.github/instructions/supabase.instructions.md` for comprehensive migration guidance.


- Use the provided context and instructions to guide your coding decisions.

- User experience should be considered at every stage of development. It is the most important aspect of the application.

- Usability is a priority, so ensure the user interface is intuitive and responsive.

- Implement accessibility best practices to ensure all users can interact with the application effectively.

- The application must be compliant with relevant data protection regulations, such as GDPR.

- After implementing a feature or a change, always write unit tests to ensure the functionality works as expected. Also revisit README.md to update any relevant documentation. Make sure to track the changes in CHANGELOG.md under a headline with the date of the change.

- **Supabase Migration Workflow**: Before implementing any feature that involves database changes:
  1. Compare database schemas between dev and prod environments using MCP tools
  2. Compare edge function versions between environments  
  3. Apply any missing migrations to production
  4. Deploy any outdated edge functions to production
  5. Verify environment parity before proceeding with new changes

- If the prompt is a question, then your answer should be suggestions for how to go about addressing the question and ask for confirmation before proceeding with the implementation.

- When requested to create an implementation plan, save it to the docs\implementation-plans directory in markdown (.md) format.

- After successfully implementing a Module or a number of related tasks in the plan, and fully testing it successfully (by running `pnpm test:ci`), update the progress for this module/tasks in the plan.

- Never use console.log() directly. Always use the logger utility from apps/frontend/src/utils/logger.ts which respects the DEBUG feature flag. Import: `import logger from '../utils/logger';` then use `logger.log()`, `logger.warn()`, `logger.error()`, etc.


