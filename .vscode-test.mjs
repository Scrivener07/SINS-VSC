import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'tests/client-test/out/**/*.test.js',
});
