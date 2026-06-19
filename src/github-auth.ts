/**
 * GitHub authentication token resolution
 *
 * @fileOverview Resolves a GitHub token from environment variables or the gh CLI
 * @module github-auth
 */

import * as spawnAsyncModule from "@expo/spawn-async";

const spawnAsync = spawnAsyncModule.default || spawnAsyncModule;

/**
 * Resolves a GitHub token from explicit sources.
 * Priority: GITHUB_TOKEN, then GH_TOKEN, then gh CLI token.
 */
export function resolveGitHubToken({
	githubToken,
	ghToken,
	ghCliToken,
}: {
	githubToken?: string;
	ghToken?: string;
	ghCliToken?: string | null;
}): string | null {
	return githubToken || ghToken || ghCliToken || null;
}

/**
 * Reads a GitHub token from the authenticated gh CLI session.
 */
export async function getGitHubTokenFromGhCli(): Promise<string | null> {
	try {
		const { stdout } = await spawnAsync("gh", ["auth", "token"], {
			stdio: ["ignore", "pipe", "pipe"],
		});
		const token = stdout.toString().trim();
		return token || null;
	} catch {
		return null;
	}
}

/**
 * Resolves a GitHub token for API and download requests.
 *
 * Checks, in order: GITHUB_TOKEN, GH_TOKEN, then `gh auth token`.
 */
export async function getGitHubToken(): Promise<string | null> {
	const envToken = resolveGitHubToken({
		githubToken: process.env.GITHUB_TOKEN,
		ghToken: process.env.GH_TOKEN,
	});

	if (envToken) {
		return envToken;
	}

	return getGitHubTokenFromGhCli();
}
