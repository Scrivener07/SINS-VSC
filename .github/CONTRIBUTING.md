## Development
This project is a mono-repository containing both the VS Code client and the language server, managed using **NPM Workspaces**.



### Initial Setup
The initial setup typically only needs to be done once after cloning the repository.

#### 1. Install Dependencies:
This will automatically install all NPM dependencies for all packages.
```shell
npm install
```


#### 2. Compile Source:
This will compile all TypeScript source for all packages.
```shell
npm run compile
```

This runs:
- `npm run compile-shared` (compiles `packages/shared` to generate `.d.ts` files)
- `webpack` (bundles client and server to `dist/`)



### Running and Debugging
This section describes how to build and run the extension from source.


#### Launching the Extension
1. Open the project in VS Code.
2. Press `F5` or select the **"Extension"** compound configuration from `.vscode/launch.json`.
3. This launches the **Extension Development Host** with attached two debuggers:
   - **Client-Debug:** Extension host with the client extension.
   - **Server-Debug:** Attaches to the language server process.


#### Watching for Changes:
Run the watch task to automatically rebuild on file changes:
```sh
npm run watch
```

**Note:** If you modify `packages/shared`, you may need to reload the *Extension Development Host* (`Ctrl+R` in the debug window) or restart the session entirely for changes to take effect. For automatic server restarts on reload, set `"restart": true` for the `Server-Debug` configuration in `.vscode/launch.json`.


### Structure
This section describes the project structure and components.

* `packages/client/`: The VS Code extension entry point and editor features.
* `packages/server/`: The Language Server Protocol (LSP) implementation handling logic, indexing, and validation.
* `packages/shared/`: Shared constants, types, and utilities used by both client and server.
* `resources/`: Bundled resources and assets for the extension.
* `syntaxes/`: The textmate language syntaxes for the VS Code extension.
* `tests/`: Unit tests for the VS Code extension and libraries.


## Configuration Architecture
This project uses **NPM Workspaces** and **TypeScript Project References** to manage dependencies between packages.
This ensures strict boundaries and faster builds.


### 1. NPM Workspaces
All dependencies are hoisted to the root `node_modules` folder.
The root `package.json` defines the workspace structure:
```json
{
	"workspaces": [
		"packages/*"
	]
}
```


### 2. The `shared` Package
The `packages/shared` folder is a standalone TypeScript project that provides shared types and constants.
This package must be compiled *before* the client or server can be built.

*   **Build Command:** `npm run compile-shared` (runs `tsc -b packages/shared`)
*   **Output:** Compiled `.js` and `.d.ts` files are output to `packages/shared/out`.
*   **Workspace Link:** Accessible as `@soase/shared` via a symlink in `node_modules/@soase/shared`.

To add `shared` as a dependency to a new package, use `npm install ../shared` from within that package's directory.


### 3. Client & Server Dependencies
Both `client` and `server` depend on `shared`.
This is handled in two ways:

1.  **NPM Workspace Dependency:**
    Declared in their `package.json` as `"@soase/shared": "file:../shared"`.
    NPM creates a symlink in the root `node_modules/@soase/shared` → `packages/shared`.

2.  **TypeScript Project Reference:**
    Their `tsconfig.json` files include a `"references": [{ "path": "../shared" }]` entry.
	This tells TypeScript to use the *compiled declaration files* (`.d.ts`) from the `packages/shared/out` folder.


### 4. Webpack Bundling
The root `webpack.config.js` bundles the extension into two files:
*   `dist/extension.js` (client)
*   `dist/server.js` (server)

Webpack uses `ts-loader` with `transpileOnly: true` to compile TypeScript on-the-fly.
The `@soase/shared` imports are resolved via webpack aliases pointing to `packages/shared/src` for direct source bundling.
Type checking happens separately via TypeScript's build mode (`tsc -b`), not during webpack compilation.

**Important:** The `dist/` folder is the final output.
Individual `packages/*/out` folders are **only** created for the `shared` package (for type declarations), not for `client` or `server`.
