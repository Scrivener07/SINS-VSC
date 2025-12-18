//@ts-check
"use strict";

const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

/** @typedef {import("webpack").Configuration} WebpackConfig **/


/** @type WebpackConfig */
const clientConfig = {
	target: "node", // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
	mode: "none", // this leaves the source code as close as possible to the original (when packaging we set this to "production")

	entry: "./packages/client/src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
	output: {
		// the bundle is stored in the "dist" folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
		path: path.resolve(__dirname, "dist"),
		filename: "extension.js",
		libraryTarget: "commonjs2"
	},
	externals: {
		vscode: "commonjs vscode" // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
		// modules added here also need to be added in the .vscodeignore file
	},
	resolve: {
		// support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
		extensions: [".ts", ".js"]
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "ts-loader",
						options: {
							// Explicitly tell ts-loader to use the client config
							configFile: "client/tsconfig.json"
						}
					}
				]
			}
		]
	},
	devtool: "source-map",
	infrastructureLogging: {
		level: "log", // enables logging required for problem matchers
	},
	ignoreWarnings: [
		{
			module: /vscode-languageserver-types/,
			message: /Critical dependency: require function is used in a way/
			/**
			 * The warning occurs because this library uses a UMD (Universal Module Definition) wrapper.
			 * The standard require() system is available at runtime, so the code will work perfectly fine despite the warning.
			*/
		}
	]
};


/** @type WebpackConfig */
const serverConfig = {
	target: "node",
	mode: "none",
	entry: "./packages/server/src/server.ts",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "server.js",
		libraryTarget: "commonjs2"
	},
	externals: {
		// The server does NOT have access to "vscode", so don't exclude it here.
		// However, it usually doesn't import it either.
	},
	resolve: {
		extensions: [".ts", ".js"]
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "ts-loader",
						options: {
							// Explicitly tell ts-loader to use the server config
							configFile: "server/tsconfig.json"
						}
					}
				]
			}
		]
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: path.resolve(__dirname, "resources", "schemas"),
					to: path.resolve(__dirname, "dist", "resources", "schemas")
				},
				{ // New or modified JSON schemas.
					from: path.resolve(__dirname, "resources", "schemas-dev"),
					to: path.resolve(__dirname, "dist", "resources", "schemas-dev")
				}
			],
		}),
	],

	devtool: "source-map",
	infrastructureLogging: {
		level: "log",
	},
};

module.exports = [clientConfig, serverConfig];
