## Development
This project is a monorepo containing both the VS Code Client and the language server.


### Structure
This section describes the project structure and components.

* `packages/client`: The VS Code extension entry point and editor features.
* `packages/server`: The Language Server Protocol (LSP) implementation handling logic, indexing, and validation.
* `packages/shared`: Shared constants, types, and utilities used by both client and server.
* `resources`: Bundled resources and assets for the extension.
* `syntaxes`: The textmate language syntaxes for the VS Code extension.
* `tests`: Unit tests for the VS Code extension and libraries.


### Building & Running
This section describes how to build and run the extension from source.

1. **Install Dependencies:**
    Run `npm install` in the root directory. This will automatically install dependencies for all packages.

2. **Launch Extension:**
    Open the project in VS Code and press `F5`. This launches the **Extension Development Host** with the client and server attached. You will want to use the `Extension` configuration in `.vscode\launch.json`.

3. **Watching for Changes:**
    The default build task is configured to watch for changes. If you modify `packages/shared`, you may need to restart the debug session for changes to propagate to the server.
