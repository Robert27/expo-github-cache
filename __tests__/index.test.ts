import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ResolveRemoteBuildCacheProps } from "@expo/config";
import buildCachePlugin from "../src/index";

// Preserve original environment
const originalEnv = { ...process.env };

// Create dummy build props
const createDummyProps = (
	platform: "ios" | "android",
): ResolveRemoteBuildCacheProps => ({
	projectRoot: "/fake/project",
	platform,
	fingerprintHash: "1234567890abcdef",
	runOptions: {
		buildCache: true,
	},
});

describe("GitHub Cache Plugin - Environment Variable Tests", () => {
	beforeEach(() => {
		// Reset environment variables before each test
		process.env = { ...originalEnv };
		delete process.env.GITHUB_TOKEN;
	});

	afterEach(() => {
		// Restore environment variables
		process.env = { ...originalEnv };
	});

	describe("resolveRemoteBuildCache", () => {
		test("should return null when GITHUB_TOKEN is missing", async () => {
			// Ensure GITHUB_TOKEN is not set
			delete process.env.GITHUB_TOKEN;

			const result = await buildCachePlugin.resolveRemoteBuildCache(
				createDummyProps("ios"),
				{ owner: "owner", repo: "repo" },
			);

			expect(result).toBeNull();
		});

		test("should return null when build cache is disabled", async () => {
			process.env.GITHUB_TOKEN = "fake-token";

			const props = createDummyProps("ios");
			props.runOptions.buildCache = false;

			const result = await buildCachePlugin.resolveRemoteBuildCache(props, {
				owner: "owner",
				repo: "repo",
			});

			expect(result).toBeNull();
		});
	});

	describe("uploadRemoteBuildCache", () => {
		test("should return null when GITHUB_TOKEN is missing", async () => {
			// Ensure GITHUB_TOKEN is not set
			delete process.env.GITHUB_TOKEN;

			const uploadProps = {
				...createDummyProps("ios"),
				buildPath: "/fake/build/path/app.zip",
			};

			const result = await buildCachePlugin.uploadRemoteBuildCache(
				uploadProps,
				{ owner: "owner", repo: "repo" },
			);

			expect(result).toBeNull();
		});
	});

	describe("Platform handling", () => {
		test("should handle iOS platform without crashing", async () => {
			// This test mainly checks that the function doesn't crash with iOS platform
			const props = createDummyProps("ios");
			props.runOptions.buildCache = false; // Disable to avoid API calls

			const result = await buildCachePlugin.resolveRemoteBuildCache(props, {
				owner: "owner",
				repo: "repo",
			});

			expect(result).toBeNull();
		});

		test("should handle Android platform without crashing", async () => {
			// This test mainly checks that the function doesn't crash with Android platform
			const props = createDummyProps("android");
			props.runOptions.buildCache = false; // Disable to avoid API calls

			const result = await buildCachePlugin.resolveRemoteBuildCache(props, {
				owner: "owner",
				repo: "repo",
			});

			expect(result).toBeNull();
		});
	});
});
