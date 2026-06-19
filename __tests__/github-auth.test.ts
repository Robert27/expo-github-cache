import { afterEach, describe, expect, test } from "bun:test";
import {
	getGitHubToken,
	getGitHubTokenFromGhCli,
	resolveGitHubToken,
} from "../src/github-auth";

describe("resolveGitHubToken", () => {
	test("prefers GITHUB_TOKEN over GH_TOKEN and gh CLI token", () => {
		expect(
			resolveGitHubToken({
				githubToken: "github-token",
				ghToken: "gh-token",
				ghCliToken: "cli-token",
			}),
		).toBe("github-token");
	});

	test("falls back to GH_TOKEN when GITHUB_TOKEN is unset", () => {
		expect(
			resolveGitHubToken({
				ghToken: "gh-token",
				ghCliToken: "cli-token",
			}),
		).toBe("gh-token");
	});

	test("falls back to gh CLI token when env vars are unset", () => {
		expect(
			resolveGitHubToken({
				ghCliToken: "cli-token",
			}),
		).toBe("cli-token");
	});

	test("returns null when no token sources are available", () => {
		expect(resolveGitHubToken({})).toBeNull();
	});
});

describe("getGitHubTokenFromGhCli", () => {
	test("returns null when gh is not authenticated", async () => {
		expect(await getGitHubTokenFromGhCli()).toBeNull();
	});
});

describe("getGitHubToken", () => {
	const originalGithubToken = process.env.GITHUB_TOKEN;
	const originalGhToken = process.env.GH_TOKEN;

	afterEach(() => {
		if (originalGithubToken) {
			process.env.GITHUB_TOKEN = originalGithubToken;
		} else {
			delete process.env.GITHUB_TOKEN;
		}

		if (originalGhToken) {
			process.env.GH_TOKEN = originalGhToken;
		} else {
			delete process.env.GH_TOKEN;
		}
	});

	test("returns GITHUB_TOKEN when set", async () => {
		process.env.GITHUB_TOKEN = "env-github-token";
		delete process.env.GH_TOKEN;

		expect(await getGitHubToken()).toBe("env-github-token");
	});

	test("returns GH_TOKEN when GITHUB_TOKEN is unset", async () => {
		delete process.env.GITHUB_TOKEN;
		process.env.GH_TOKEN = "env-gh-token";

		expect(await getGitHubToken()).toBe("env-gh-token");
	});

	test("returns null when no env vars are set and gh is unavailable", async () => {
		delete process.env.GITHUB_TOKEN;
		delete process.env.GH_TOKEN;

		expect(await getGitHubToken()).toBeNull();
	});
});
