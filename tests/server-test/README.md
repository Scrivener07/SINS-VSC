# Server Tests
Unit tests for the language server package.
These tests run pure Node.js code and do not require the VS Code API.

## Running Tests
There are two ways to run the server tests:

### 1. VS Code Task
Run from the command palette (**Ctrl+Shift+P** → **Tasks: Run Task** → **test: server**).

This invokes Mocha directly via the npm script `test:server` where no VS Code window is launched, no Electron overhead.
This is the fastest way to run server tests.

All tests can also be run (server + extension) with the **test: all** task.

### 2. VS Code Test Explorer
Server tests appear in the Test Explorer sidebar alongside extension tests.
This is configured in [`.vscode-test.mjs`](../../.vscode-test.mjs) using `@vscode/test-cli`.

> **Note:** The Test Explorer still launches a headless Electron instance (`--disable-gpu`, `--headless`) to run these tests, even though the server code has no VS Code API dependency. This adds startup overhead compared to running Mocha directly. Use the task or terminal for faster iteration.

## Configuration Files
These are the relevant configuration files for this test.

| File | Purpose |
|------|---------|
| [`tsconfig.json`](./tsconfig.json) | TypeScript compiler options for the test package. References `packages/server` and `packages/shared` as project references. |
| [`.mocharc.json`](./.mocharc.json) | Mocha runner configuration (TDD interface, timeout, file glob). Used by the `test:server` npm script. |
| [`../../.vscode-test.mjs`](../../.vscode-test.mjs) | Defines test profiles for VS Code Test Explorer. The `Server Tests` profile points at this package's compiled output. |
| [`../../.vscode/tasks.json`](../../.vscode/tasks.json) | VS Code tasks including `test: server`, `test: extension`, and `test: all`. |

## Writing Tests
- Tests use the **TDD** interface (`suite`, `test`, `setup`, `teardown`) to stay consistent with the extension tests.
- Import server classes from the compiled output, not source:
  ```typescript
  import { Report } from "../../../packages/server/out/providers/diagnostic";
  ```
- Test files must end in `*.test.ts` and live in the `src/` directory.


## Adding a New Test
1. Create a new `*.test.ts` file in `src/`.
2. Compile: `npm run compile-tests`
3. Run: `npm run test:server`
