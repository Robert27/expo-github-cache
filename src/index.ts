/**
 * GitHub Cache Provider for Expo Build Process
 *
 * @fileOverview Main entry point for the GitHub Cache provider plugin for Expo
 * @module index
 */

import * as path from "node:path";
import type {
	BuildCacheProviderPlugin,
	ResolveBuildCacheProps,
	UploadBuildCacheProps,
} from "@expo/config";
import * as fs from "fs-extra";
import { downloadAndMaybeExtractAppAsync } from "./download";
import { createReleaseAndUploadAsset, fetchReleaseAssetsByTag } from "./github";
import { logger } from "./logger";
import type { RunOptions } from "./types";
import { getBuildCacheDirectory, isDevClientBuild } from "./utils";

/**
 * Resolves and retrieves a cached build from GitHub if available
 *
 * @param {ResolveBuildCacheProps} props - Build context properties from Expo
 * @param {object} githubConfig - GitHub repository configuration
 * @param {string} githubConfig.owner - Repository owner/organization name
 * @param {string} githubConfig.repo - Repository name
 * @returns {Promise<string|null>} - Path to the cached build or null if unavailable
 */
const fetchCachedBuild = async (
	{
		projectRoot,
		platform,
		fingerprintHash,
		runOptions,
	}: ResolveBuildCacheProps,
	{ owner, repo }: { owner: string; repo: string },
): Promise<string | null> => {
	if (!runOptions.buildCache) {
		logger.info("Build cache is disabled, skipping download");
		return null;
	}

	const cachedAppPath = getCachedAppPath({
		fingerprintHash,
		platform,
		projectRoot,
		runOptions,
	});

	if (fs.existsSync(cachedAppPath)) {
		logger.success("Cached build found, skipping download");
		return cachedAppPath;
	}

	logger.startSpinner(
		"Searching builds with matching fingerprint on Github Releases",
	);

	try {
		const tag = getTagName({
			fingerprintHash,
			projectRoot,
			runOptions,
			platform,
		});
		const githubToken = process.env.GITHUB_TOKEN;
		if (!githubToken) {
			logger.failSpinner("GitHub token not found");
			logger.error("Missing GITHUB_TOKEN environment variable");
			return null;
		}

		const assets = await fetchReleaseAssetsByTag({
			token: githubToken,
			owner,
			repo,
			tag,
		});

		if (!assets || assets.length === 0) {
			logger.failSpinner("");
			logger.warn("No assets found for this fingerprint");
			return null;
		}

		// Use the API URL (url) instead of browser_download_url for GitHub API downloads
		const buildDownloadURL = assets[0].url;
		if (!buildDownloadURL) {
			logger.failSpinner("");
			logger.warn("Asset URL not found in the release");
			return null;
		}

		logger.info(
			`Asset name: ${assets[0].name}, size: ${Math.round((assets[0].size || 0) / 1024 / 1024)}MB`,
		);
		logger.succeedSpinner("Build found on GitHub Releases");

		try {
			const result = await downloadAndMaybeExtractAppAsync(
				buildDownloadURL,
				platform,
				cachedAppPath,
			);
			if (result) {
				return result;
			}
			logger.warn("Download completed but no valid app was extracted");
		} catch (downloadError) {
			logger.error("Failed to download or extract the app", downloadError);
		}
	} catch (error) {
		if (error instanceof Error && error.message.includes("No release found")) {
			// This is an expected case when no cache exists, don't show stacktrace
			logger.failSpinner("No cached builds available for this fingerprint");
		} else {
			// For unexpected errors, show more details
			logger.failSpinner(
				`Cache retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	return null;
};

/**
 * Publishes a build artifact to GitHub Releases for caching
 *
 * @param {UploadRemoteBuildCacheProps} props - Build artifact properties
 * @param {object} githubConfig - GitHub repository configuration
 * @param {string} githubConfig.owner - Repository owner/organization name
 * @param {string} githubConfig.repo - Repository name
 * @returns {Promise<string|null>} - URL of the published artifact or null on failure
 */
const publishBuildCache = async (
	{
		projectRoot,
		fingerprintHash,
		runOptions,
		buildPath,
		platform,
	}: UploadBuildCacheProps,
	{ owner, repo }: { owner: string; repo: string },
): Promise<string | null> => {
	logger.startSpinner("Uploading build to Github Releases");

	try {
		const tagName = getTagName({
			fingerprintHash,
			projectRoot,
			runOptions,
			platform,
		});
		const githubToken = process.env.GITHUB_TOKEN;
		if (!githubToken) {
			logger.failSpinner("GitHub token not found");
			logger.error("Missing GITHUB_TOKEN environment variable");
			return null;
		}

		const result = await createReleaseAndUploadAsset({
			token: githubToken,
			owner,
			repo,
			tagName,
			binaryPath: buildPath,
		});
		logger.succeedSpinner("Build successfully uploaded to GitHub Releases");
		return result;
	} catch (error) {
		logger.failSpinner("Release failed");
		logger.error("Release failed", error);
	}

	return null;
};

/**
 * Generates a GitHub tag name for the build artifact based on its properties
 *
 * @param {Object} params - Parameters for tag generation
 * @param {string} params.fingerprintHash - Unique hash identifying the build content
 * @param {string} params.projectRoot - Project root directory path
 * @param {RunOptions} params.runOptions - Build run options
 * @param {"ios" | "android"} params.platform - Target platform
 * @returns {string} - Generated tag name for GitHub release
 */
function getTagName({
	fingerprintHash,
	projectRoot,
	runOptions,
	platform,
}: {
	fingerprintHash: string;
	projectRoot: string;
	runOptions: RunOptions;
	platform: "ios" | "android";
}): string {
	const isDevClient = isDevClientBuild({ projectRoot, runOptions });
	return `fingerprint.${fingerprintHash}${isDevClient ? ".dev-client" : ""}.${platform}`;
}

/**
 * Generates the full path for a cached application file
 *
 * @param {ResolveRemoteBuildCacheProps} props - Build properties containing metadata
 * @returns {string} - Full path to the cached application file
 */
function getCachedAppPath({
	fingerprintHash,
	platform,
	projectRoot,
	runOptions,
}: ResolveBuildCacheProps): string {
	return path.join(
		getBuildCacheDirectory(),
		`${getTagName({ fingerprintHash, projectRoot, runOptions, platform })}.${platform === "ios" ? "app" : "apk"}`,
	);
}

export default {
	resolveRemoteBuildCache: fetchCachedBuild,
	uploadRemoteBuildCache: publishBuildCache,
} satisfies BuildCacheProviderPlugin;
