/**
 * Filesystem and project detection utilities for build cache operations
 *
 * @fileOverview Core utility functions for analyzing projects and managing cache directories
 * @module utils
 */

import * as path from "node:path";
import { getPackageJson } from "@expo/config";
import envPaths from "env-paths";
import type { RunOptions } from "./types";

// Define application-specific temporary directory path
const { temp: APP_TEMP_DIRECTORY } = envPaths("github-build-cache-provider");

/**
 * Determines if the current build is a development client build
 *
 * @param {Object} params - Parameters object
 * @param {RunOptions} params.runOptions - Build run options from Expo
 * @param {string} params.projectRoot - Project root directory path
 * @returns {boolean} - True if this is a dev client build
 */
export function isDevClientBuild({
	runOptions,
	projectRoot,
}: {
	runOptions: RunOptions;
	projectRoot: string;
}): boolean {
	if (!detectDevClientDependency(projectRoot)) {
		return false;
	}

	if ("variant" in runOptions && runOptions.variant !== undefined) {
		return runOptions.variant === "debug";
	}
	if ("configuration" in runOptions && runOptions.configuration !== undefined) {
		return runOptions.configuration === "Debug";
	}

	return true;
}

/**
 * Checks if the project has expo-dev-client as a direct dependency
 *
 * @param {string} projectRoot - Project root directory path
 * @returns {boolean} - True if expo-dev-client is a direct dependency
 */
export function detectDevClientDependency(projectRoot: string): boolean {
	const { dependencies = {}, devDependencies = {} } =
		getPackageJson(projectRoot);
	return (
		!!dependencies["expo-dev-client"] || !!devDependencies["expo-dev-client"]
	);
}

/**
 * Returns the application temporary directory path
 *
 * @returns {string} - Temporary directory path
 */
export function getTemporaryDirectory(): string {
	return APP_TEMP_DIRECTORY;
}

/**
 * Returns the path for storing build cache files
 *
 * @returns {string} - Build cache directory path
 */
export function getBuildCacheDirectory(): string {
	return path.join(getTemporaryDirectory(), "build-run-cache");
}
