/**
 * Application artifact download and extraction utilities
 *
 * @fileOverview Handles downloading, extracting, and caching build artifacts
 * @module download
 */

import * as spawnAsyncModule from "@expo/spawn-async";
const spawnAsync = spawnAsyncModule.default || spawnAsyncModule;
import * as globModule from "fast-glob";
const glob = globModule.default || globModule;
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import * as fs from "fs-extra";
import fetch from "node-fetch";
import { extract } from "tar";
import { uuidv7 } from "uuidv7";
import { logger } from "./logger";
import { getTemporaryDirectory } from "./utils";

/**
 * Downloads a file from a URL with progress tracking
 *
 * @param {string} url - URL of the file to download
 * @param {string} outputPath - Local path to save the downloaded file
 * @returns {Promise<void>}
 */
async function downloadFileAsync(
	url: string,
	outputPath: string,
): Promise<void> {
	try {
		logger.info(`Downloading from URL: ${url}`);

		let isGitHubApiUrl = false;
		try {
			const parsedUrl = new URL(url);
			isGitHubApiUrl = parsedUrl.hostname === "api.github.com";
		} catch {
			// Invalid URL format, treat as non-GitHub
			isGitHubApiUrl = false;
		}

		const headers: Record<string, string> = {
			Accept: "application/octet-stream",
		};

		if (process.env.GITHUB_TOKEN) {
			headers.Authorization = isGitHubApiUrl
				? `token ${process.env.GITHUB_TOKEN}`
				: `Bearer ${process.env.GITHUB_TOKEN}`;
		}

		const response = await fetch(url, { headers });

		if (!response.ok || !response.body) {
			throw new Error(
				`Failed to download file from ${url}, because ${response.status} ${response.statusText}`,
			);
		}

		const contentLength = Number.parseInt(
			response.headers.get("content-length") || "0",
			10,
		);

		logger.startSpinner("Downloading file");

		if (contentLength > 0) {
			let receivedBytes = 0;
			const downloadStream = response.body;

			downloadStream.on("data", (chunk) => {
				receivedBytes += chunk.length;
				const downloadedMB = Math.floor(receivedBytes / 1024 / 1024);
				const totalMB = Math.floor(contentLength / 1024 / 1024);
				logger.updateSpinner(`Downloading ${downloadedMB}MB / ${totalMB}MB`);
			});

			await pipeline(downloadStream, fs.createWriteStream(outputPath));
		} else {
			await pipeline(response.body, fs.createWriteStream(outputPath));
		}

		logger.succeedSpinner("Download complete");
	} catch (error: any) {
		if (await fs.pathExists(outputPath)) {
			await fs.remove(outputPath);
		}
		throw error;
	}
}

async function maybeCacheAppAsync(
	appPath: string,
	cachedAppPath?: string,
): Promise<string> {
	if (cachedAppPath) {
		await fs.ensureDir(path.dirname(cachedAppPath));
		logger.startSpinner("Caching app for future use");
		await fs.move(appPath, cachedAppPath);
		logger.succeedSpinner("App cached successfully");
		return cachedAppPath;
	}
	return appPath;
}

/**
 * Downloads and extracts application artifacts from a remote URL
 *
 * @param {string} url - URL of the application artifact to download
 * @param {"ios" | "android"} platform - Target platform of the artifact
 * @param {string} [cachedAppPath] - Optional path to cache the artifact
 * @returns {Promise<string>} - Path to the downloaded/extracted application
 */
export async function downloadAndMaybeExtractAppAsync(
	url: string,
	platform: "ios" | "android",
	cachedAppPath?: string,
): Promise<string> {
	const outputDir = path.join(getTemporaryDirectory(), uuidv7());
	await fs.promises.mkdir(outputDir, { recursive: true });

	if (platform === "android") {
		const apkFilePath = path.join(outputDir, `${uuidv7()}.apk`);
		logger.info("Downloading Android APK");
		await downloadFileAsync(url, apkFilePath);
		return await maybeCacheAppAsync(apkFilePath, cachedAppPath);
	}
	const tmpArchivePathDir = path.join(getTemporaryDirectory(), uuidv7());
	await fs.mkdir(tmpArchivePathDir, { recursive: true });

	const tmpArchivePath = path.join(tmpArchivePathDir, `${uuidv7()}.tar.gz`);
	logger.info("Downloading iOS app archive");
	await downloadFileAsync(url, tmpArchivePath);
	logger.success("Successfully downloaded app archive");

	logger.startSpinner("Extracting app archive");
	await tarExtractAsync(tmpArchivePath, outputDir);
	logger.succeedSpinner("Archive extracted successfully");

	const appPath = await getAppPathAsync(
		outputDir,
		platform === "ios" ? "app" : "apk",
	);
	return await maybeCacheAppAsync(appPath, cachedAppPath);
}

/**
 * Extracts application artifacts from a local archive file
 *
 * @param {string} appArchivePath - Path to the local archive file
 * @param {"ios" | "android"} platform - Target platform of the artifact
 * @returns {Promise<string>} - Path to the extracted application
 */
export async function extractAppFromLocalArchiveAsync(
	appArchivePath: string,
	platform: "ios" | "android",
): Promise<string> {
	const outputDir = path.join(getTemporaryDirectory(), uuidv7());
	await fs.promises.mkdir(outputDir, { recursive: true });

	logger.startSpinner(`Extracting ${platform} app from local archive`);
	await tarExtractAsync(appArchivePath, outputDir);
	logger.succeedSpinner("Archive extracted successfully");

	return await getAppPathAsync(
		outputDir,
		platform === "android" ? "apk" : "app",
	);
}

async function getAppPathAsync(
	outputDir: string,
	applicationExtension: string,
): Promise<string> {
	logger.startSpinner(`Locating ${applicationExtension} file`);
	const appFilePaths = await glob(`./**/*.${applicationExtension}`, {
		cwd: outputDir,
		onlyFiles: false,
	});
	if (appFilePaths.length === 0) {
		logger.failSpinner("Search failed");
		throw Error("Did not find any installable apps inside tarball.");
	}
	logger.succeedSpinner(`Found ${applicationExtension} file`);
	return path.join(outputDir, appFilePaths[0]);
}

/**
 * Extracts a tar archive file with platform-specific optimizations
 *
 * @param {string} input - Path to the tar archive file
 * @param {string} output - Directory where contents will be extracted
 * @returns {Promise<void>}
 */
async function tarExtractAsync(input: string, output: string): Promise<void> {
	try {
		if (process.platform !== "win32") {
			// Use native tar command on non-Windows platforms for better performance
			await spawnAsync("tar", ["-xf", input, "-C", output], {
				stdio: "inherit",
			});
			return;
		}
	} catch (error: any) {
		logger.warn(
			`Failed to extract tar using native tools, falling back on JS tar module. ${error.message}`,
		);
	}

	// Fall back to JavaScript-based extraction when native tar fails or on Windows
	logger.info(`Extracting ${path.basename(input)} using JS tar module`);
	await extract({ file: input, cwd: output });
}
