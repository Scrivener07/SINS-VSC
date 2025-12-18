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



## Configuration Architecture
This project uses **TypeScript Project References** to manage dependencies between the packages.
This ensures strict boundaries and faster builds.


### 1. The `shared` Package
The `packages/shared` folder is a standalone TypeScript project.
It must be compiled *before* the client or server can be built.
*   **Build Command:** `tsc -b packages/shared`
*   **Output:** Compiled files are output to `packages/shared/out`.


### 2. Client & Server Dependencies
Both `client` and `server` depend on `shared`.
This is handled in two ways:

1.  **NPM Dependency:**
    They reference the local package via `npm install ../shared`. This creates a symlink in `node_modules/@soase/shared`.
2.  **TypeScript Reference:**
    Their `tsconfig.json` files include a `"references": [{ "path": "../shared" }]` entry. This tells TypeScript to use the *compiled declaration files* (`.d.ts`) from the shared `out` folder, rather than recompiling the raw source code.


### 3. Webpack
The root `webpack.config.js` bundles the extension.
*   It does **not** compile the `shared` package source code directly.
*   Instead, it resolves `@soase/shared` from `node_modules`, treating it like any other external library.
*   **Important:** Do not add Webpack aliases pointing to `shared/src`. This will break the build by bypassing the project reference structure.



### Building & Running
This section describes how to build and run the extension from source.

1. **Install Dependencies:**
	Run `npm install` in the root directory.
	This will automatically install dependencies for all packages.

2. **Launch Extension:**
	Open the project in VS Code and press `F5`.
	This launches the **Extension Development Host** with the client and server attached.
	You will want to use the `Extension` configuration in `.vscode\launch.json`.

3. **Watching for Changes:**
	The default build task is configured to watch for changes.

	**Note:** If you modify `packages/shared`, the build script should automatically pick it up.
	But you may need to reload the extension host (`Ctrl+R`) or restart the debug session for the changes to take effect.



### Manual Setup
If you need to re-initialize the dependencies manually, follow this order:

1.  **Shared:**
```shell
cd packages/shared
npm install
npm run compile
```

2.  **Client:**
```shell
cd packages/client
npm install
npm install ../shared
npm install vscode-languageclient@latest
```

3.  **Server:**
```shell
cd packages/server
npm install
npm install ../shared
npm install vscode-languageserver@latest
```
