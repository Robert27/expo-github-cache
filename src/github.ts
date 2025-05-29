/**
 * GitHub Release Management Service
 *
 * @fileOverview Manages GitHub releases and assets for build artifact caching
 * @module github-service
 */

import * as path from "node:path";
import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";
import * as fs from "fs-extra";
import { create as createTar } from "tar";
import { uuidv7 } from "uuidv7";
import { logger } from "./logger";
import { getTemporaryDirectory } from "./utils";

/**
 * Configuration parameters for GitHub release creation and asset publishing
 *
 * Contains all necessary information to authenticate with GitHub and publish releases
 */
interface ReleasePublishConfig {
	/** GitHub personal access token with permissions for repo and release management */
	token: string;
	/** Repository owner or organization name */
	owner: string;
	/** Repository name without owner prefix */
	repo: string;
	/** Git tag name to associate with the release (will be created if needed) */
	tagName: string;
	/** Filesystem path to the build artifact file or directory to upload */
	binaryPath: string;
}

/**
 * Creates or updates a GitHub release and uploads a build artifact as an asset
 *
 * @param {ReleasePublishConfig} config - Configuration for the GitHub release
 * @returns {Promise<string>} - Public URL of the uploaded asset for downloading
 */
export async function createReleaseAndUploadAsset({
	token,
	owner,
	repo,
	tagName,
	binaryPath,
}: ReleasePublishConfig) {
	const octokit = new Octokit({ auth: token });

	try {
		let releaseId: number;

		logger.startSpinner(`Getting commit SHA from repository ${owner}/${repo}`);
		const commitSha = await findDefaultBranchCommit(octokit, owner, repo);
		logger.succeedSpinner(`Found commit SHA: ${commitSha.substring(0, 7)}`);

		logger.startSpinner(`Ensuring tag ${tagName} exists`);
		const { exists } = await createOrRetrieveGitTag(octokit, {
			owner,
			repo,
			tag: tagName,
			message: tagName,
			object: commitSha,
			type: "commit",
		});
		logger.succeedSpinner(
			`Tag ${exists ? "already exists" : "created successfully"}`,
		);

		if (exists) {
			logger.startSpinner(`Getting existing release for tag ${tagName}`);
			const existingRelease = await octokit.rest.repos.getReleaseByTag({
				owner,
				repo,
				tag: tagName,
			});
			releaseId = existingRelease.data.id;
			logger.succeedSpinner(`Found existing release with ID: ${releaseId}`);
		} else {
			logger.startSpinner(`Creating new release for tag ${tagName}`);
			const newRelease = await octokit.rest.repos.createRelease({
				owner,
				repo,
				tag_name: tagName,
				name: tagName,
				draft: false,
				prerelease: true,
			}); // prettier-ignore
			releaseId = newRelease.data.id;
			logger.succeedSpinner(`Created new release with ID: ${releaseId}`);
		}

		logger.startSpinner("Uploading asset to release");
		const result = await uploadReleaseAsset(octokit, {
			owner,
			repo,
			releaseId,
			binaryPath,
		});
		logger.succeedSpinner("Asset uploaded successfully");

		return result.data.browser_download_url;
	} catch (error) {
		logger.error("GitHub release failed", error);
		throw new Error(
			`GitHub release failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Retrieves the latest commit SHA from a repository with intelligent branch detection
 *
 * This function attempts to find the default branch by trying common conventions
 * like "main" and "master" in order of popularity.
 *
 * @param {Octokit} octokit - Authenticated Octokit API client
 * @param {string} owner - Repository owner or organization name
 * @param {string} repo - Repository name
 * @returns {Promise<string>} - The SHA hash of the latest commit on the default branch
 * @throws {Error} - When no valid branch can be found after exhausting options
 */
async function findDefaultBranchCommit(
	octokit: Octokit,
	owner: string,
	repo: string,
): Promise<string> {
	// Common default branch names in order of modern popularity
	const defaultBranchCandidates = ["main", "master"];

	// Try each branch name in sequence until one works
	for (const branchName of defaultBranchCandidates) {
		try {
			logger.updateSpinner(`Detecting branch: ${branchName}`);
			const { data } = await octokit.rest.repos.getBranch({
				owner,
				repo,
				branch: branchName,
			});
			return data.commit.sha;
		} catch (error) {
			if (
				error instanceof Error &&
				error.message.includes("Branch not found")
			) {
				const isLastAttempt =
					branchName ===
					defaultBranchCandidates[defaultBranchCandidates.length - 1];
				if (isLastAttempt) {
					throw new Error(
						`Could not find any default branch in ${owner}/${repo}`,
					);
				}
				continue;
			}
			throw error;
		}
	}
	throw new Error("Could not determine repository default branch");
}

/**
 * Creates or retrieves an annotated Git tag for a specific commit
 *
 * This function checks if a tag already exists and creates it if needed.
 * Annotated tags contain additional metadata compared to lightweight tags.
 *
 * @param {Octokit} octokit - Authenticated Octokit API client
 * @param {RestEndpointMethodTypes["git"]["createTag"]["parameters"]} params - Tag creation parameters
 * @returns {Promise<{sha: string, exists: boolean}>} - Tag SHA and whether it already existed
 * @throws {Error} - When tag operations fail for reasons other than tag not found
 */
async function createOrRetrieveGitTag(
	octokit: Octokit,
	params: RestEndpointMethodTypes["git"]["createTag"]["parameters"],
): Promise<{ sha: string; exists: boolean }> {
	const { owner, repo, tag } = params;
	const refName = `refs/tags/${tag}`;

	try {
		const { data: existingRef } = await octokit.rest.git.getRef({
			owner,
			repo,
			ref: `tags/${tag}`,
		});
		return { sha: existingRef.object.sha, exists: true };
	} catch (err: any) {
		if (err.status !== 404) {
			throw err;
		}
	}

	// Create the annotated tag object
	const { data: tagData } = await octokit.rest.git.createTag(params);

	// Create the tag reference pointing to the tag object
	await octokit.rest.git.createRef({
		owner,
		repo,
		ref: refName,
		sha: tagData.sha,
	});
	return { sha: tagData.sha, exists: false };
}

/**
 * Asset upload configuration for GitHub releases
 */
interface AssetUploadParams {
	/** Repository owner or organization name */
	owner: string;
	/** Repository name */
	repo: string;
	/** GitHub Release ID where asset will be attached */
	releaseId: number;
	/** Path to the build artifact file or directory */
	binaryPath: string;
}

/**
 * Uploads a build artifact as a release asset to GitHub
 *
 * Handles both file and directory artifacts (directories are automatically archived)
 *
 * @param {Octokit} octokit - Authenticated Octokit client
 * @param {AssetUploadParams} params - Upload configuration parameters
 * @returns {Promise<any>} - GitHub API response with asset information
 */
async function uploadReleaseAsset(octokit: Octokit, params: AssetUploadParams) {
	let filePath = params.binaryPath;
	let name = path.basename(filePath);

	if ((await fs.stat(filePath)).isDirectory()) {
		logger.info("Asset is a directory, creating tarball");
		await fs.mkdirp(getTemporaryDirectory());
		const tarPath = path.join(getTemporaryDirectory(), `${uuidv7()}.tar.gz`);
		const parentPath = path.dirname(filePath);

		logger.startSpinner("Creating tarball from directory");
		await createTar({ cwd: parentPath, file: tarPath, gzip: true }, [name]);
		logger.succeedSpinner(`Tarball created at ${path.basename(tarPath)}`);

		filePath = tarPath;
		name = `${name}.tar.gz`;
	}

	logger.startSpinner("Reading file data for upload");
	const fileData = await fs.readFile(filePath);
	logger.updateSpinner(
		`Uploading ${name} (${(fileData.length / 1024 / 1024).toFixed(2)} MB)`,
	);

	return octokit.rest.repos.uploadReleaseAsset({
		owner: params.owner,
		repo: params.repo,
		release_id: params.releaseId,
		name,
		data: fileData as unknown as string, // Type workaround for binary data
		headers: {
			"content-type": "application/octet-stream",
			"content-length": fileData.length.toString(),
		},
	});
}

/**
 * Asset retrieval configuration
 */
interface AssetSearchConfig {
	/** GitHub personal access token with repository read access */
	token: string;
	/** Repository owner or organization name */
	owner: string;
	/** Repository name */
	repo: string;
	/** Git tag name associated with the release containing assets */
	tag: string;
}

/**
 * Retrieves build artifacts from a GitHub release by its tag name
 *
 * @param {AssetSearchConfig} config - Search configuration parameters
 * @returns {Promise<Array<any>>} - Array of release assets with download URLs and metadata
 * @throws {Error} - When release doesn't exist or assets cannot be retrieved
 */
export async function fetchReleaseAssetsByTag({
	token,
	owner,
	repo,
	tag,
}: AssetSearchConfig) {
	const octokit = new Octokit({ auth: token });
	try {
		const release = await octokit.rest.repos.getReleaseByTag({
			owner,
			repo,
			tag,
		});
		return release.data.assets;
	} catch (error: any) {
		// For 404 errors (release not found), don't log an error - this is expected when no cache exists
		if (error.status === 404) {
			throw new Error(`No release found with tag ${tag}`);
		}
		// For other errors, log them as they might indicate actual issues
		logger.error(`Error accessing GitHub release for tag ${tag}`, error);
		throw error;
	}
}
