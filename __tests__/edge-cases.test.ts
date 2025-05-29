import { describe, expect, test } from "bun:test";
import type { ResolveRemoteBuildCacheProps } from "@expo/config";
import buildCachePlugin from "../src/index";

describe("Build Cache Edge Cases", () => {
	test("should handle empty fingerprint hash", async () => {
		const props: ResolveRemoteBuildCacheProps = {
			projectRoot: "/fake/project",
			platform: "ios",
			fingerprintHash: "", // Empty fingerprint hash
			runOptions: {
				buildCache: false, // Disable to avoid API calls
			},
		};

		const result = await buildCachePlugin.resolveRemoteBuildCache(props, {
			owner: "owner",
			repo: "repo",
		});

		expect(result).toBeNull();
	});

	test("should handle empty project root", async () => {
		const props: ResolveRemoteBuildCacheProps = {
			projectRoot: "", // Empty project root
			platform: "ios",
			fingerprintHash: "1234567890abcdef",
			runOptions: {
				buildCache: false, // Disable to avoid API calls
			},
		};

		const result = await buildCachePlugin.resolveRemoteBuildCache(props, {
			owner: "owner",
			repo: "repo",
		});

		expect(result).toBeNull();
	});

	test("should handle undefined runOptions", async () => {
		const props: ResolveRemoteBuildCacheProps = {
			projectRoot: "/fake/project",
			platform: "android",
			fingerprintHash: "1234567890abcdef",
			runOptions: {} as any, // Empty runOptions
		};

		const result = await buildCachePlugin.resolveRemoteBuildCache(props, {
			owner: "owner",
			repo: "repo",
		});

		// Should return null when buildCache is not explicitly set to true
		expect(result).toBeNull();
	});

	test("should handle empty owner/repo parameters", async () => {
		const props: ResolveRemoteBuildCacheProps = {
			projectRoot: "/fake/project",
			platform: "ios",
			fingerprintHash: "1234567890abcdef",
			runOptions: {
				buildCache: false, // Disable to avoid API calls
			},
		};

		// Test with empty owner
		const result1 = await buildCachePlugin.resolveRemoteBuildCache(props, {
			owner: "",
			repo: "repo",
		});
		expect(result1).toBeNull();

		// Test with empty repo
		const result2 = await buildCachePlugin.resolveRemoteBuildCache(props, {
			owner: "owner",
			repo: "",
		});
		expect(result2).toBeNull();
	});

	test("should handle upload with missing build path", async () => {
		const props = {
			projectRoot: "/fake/project",
			platform: "ios" as const,
			fingerprintHash: "1234567890abcdef",
			runOptions: {
				buildCache: true,
			},
			buildPath: "", // Empty build path
		};

		// Remove GITHUB_TOKEN to avoid actual API calls
		const originalToken = process.env.GITHUB_TOKEN;
		delete process.env.GITHUB_TOKEN;

		const result = await buildCachePlugin.uploadRemoteBuildCache(props, {
			owner: "owner",
			repo: "repo",
		});

		expect(result).toBeNull();

		// Restore token if it existed
		if (originalToken) {
			process.env.GITHUB_TOKEN = originalToken;
		}
	});
});
