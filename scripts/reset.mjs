import { rmSync } from "fs";
import { execSync } from "child_process";

// Step 1: Clean tsc build outputs
console.log("Cleaning tsc build outputs...");
execSync("tsc -b --clean", { stdio: "inherit" });

// Step 2: Remove generated directories
const directories = [
    "dist",
    ".vscode-test",
    "node_modules",
];

for (const directory of directories) {
    console.log(`Removing ${directory}...`);
    rmSync(directory, { recursive: true, force: true });
}

console.log("Reset complete. Run 'npm install' to restore dependencies.");
