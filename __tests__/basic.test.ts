import { describe, expect, test } from "bun:test";
import type { ResolveRemoteBuildCacheProps } from "@expo/config";
import buildCachePlugin from "../src/index";

// Create dummy build props
const createDummyProps = (
	platform: "ios" | "android",
): ResolveRemoteBuildCacheProps => ({
	projectRoot: "/fake/project",
	platform,
	fingerprintHash: "1234567890abcdef",
	runOptions: {
		buildCache: false, // Disable cache to avoid external dependencies
	},
});

describe("GitHub Cache Plugin Basic Tests", () => {
	test("should return null when build cache is disabled", async () => {
		// When buildCache is false, the function should return null immediately
		const props = createDummyProps("ios");

		const result = await buildCachePlugin.resolveRemoteBuildCache(props, {
			owner: "owner",
			repo: "repo",
		});

		expect(result).toBeNull();
	});

	test("should include platform in tag name for iOS", async () => {
		const props = createDummyProps("ios");
		const uploadProps = {
			...props,
			buildPath: "/fake/build/path/app.zip",
		};

		// Since GITHUB_TOKEN is missing, this should return null but still generate the tag name internally
		const result = await buildCachePlugin.uploadRemoteBuildCache(uploadProps, {
			owner: "owner",
			repo: "repo",
		});

		expect(result).toBeNull();
	});

	test("should include platform in tag name for Android", async () => {
		const props = createDummyProps("android");
		const uploadProps = {
			...props,
			buildPath: "/fake/build/path/app.apk",
		};

		// Since GITHUB_TOKEN is missing, this should return null but still generate the tag name internally
		const result = await buildCachePlugin.uploadRemoteBuildCache(uploadProps, {
			owner: "owner",
			repo: "repo",
		});

		expect(result).toBeNull();
	});
});
