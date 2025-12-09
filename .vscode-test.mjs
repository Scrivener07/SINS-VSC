import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'packages/client-test/out/**/*.test.js',
});
