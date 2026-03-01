import { defineConfig } from '@vscode/test-cli';
import { readFileSync } from 'fs';


export default defineConfig([
    test_extension_configuration(),
    test_server_configuration()
]);


function test_extension_configuration() {
    return {
        label: 'Extension Tests',
        files: 'tests/client-test/out/**/*.test.js',
    };
}


function test_server_configuration() {
    const mocharc_json = JSON.parse(readFileSync('tests/server-test/.mocharc.json', 'utf-8'));
    return {
        label: 'Server Tests',
        files: mocharc_json.spec,
        mocha: {
            ui: mocharc_json.ui,
            timeout: mocharc_json.timeout
        },
        launchArgs: [
            '--disable-gpu',
            '--headless'
        ]
    };
}
