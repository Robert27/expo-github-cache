import { describe, expect, mock, test } from "bun:test";
import * as utils from "../src/utils";

// Mock getPackageJson function from @expo/config
mock.module("@expo/config", () => ({
	getPackageJson: mock(() => ({
		dependencies: {},
		devDependencies: {},
	})),
}));

describe("Utils", () => {
	describe("isDevClientBuild", () => {
		test("should return false if expo-dev-client is not a dependency", () => {
			const config = {
				runOptions: {},
				projectRoot: "/fake/project",
			};

			const result = utils.isDevClientBuild(config);

			expect(result).toBe(false);
		});

		test("should return true if expo-dev-client is a dependency and variant is debug", () => {
			// Mock getPackageJson to return a project with expo-dev-client
			const getPackageJsonMock = mock.module("@expo/config", () => ({
				getPackageJson: () => ({
					dependencies: { "expo-dev-client": "1.0.0" },
					devDependencies: {},
				}),
			}));

			const config = {
				runOptions: { variant: "debug" },
				projectRoot: "/fake/project",
			};

			const result = utils.isDevClientBuild(config);

			expect(result).toBe(true);
		});

		test("should return true if expo-dev-client is a dependency and configuration is Debug", () => {
			// Mock getPackageJson to return a project with expo-dev-client
			const getPackageJsonMock = mock.module("@expo/config", () => ({
				getPackageJson: () => ({
					dependencies: { "expo-dev-client": "1.0.0" },
					devDependencies: {},
				}),
			}));

			const config = {
				runOptions: { configuration: "Debug" },
				projectRoot: "/fake/project",
			};
			// @ts-ignore
			const result = utils.isDevClientBuild(config);

			expect(result).toBe(true);
		});

		test("should return false if expo-dev-client is a dependency but variant is not debug", () => {
			// Mock getPackageJson to return a project with expo-dev-client
			const getPackageJsonMock = mock.module("@expo/config", () => ({
				getPackageJson: () => ({
					dependencies: { "expo-dev-client": "1.0.0" },
					devDependencies: {},
				}),
			}));

			const config = {
				runOptions: { variant: "release" },
				projectRoot: "/fake/project",
			};

			const result = utils.isDevClientBuild(config);

			expect(result).toBe(false);
		});
	});

	describe("detectDevClientDependency", () => {
		test("should return true when expo-dev-client is in dependencies", () => {
			// Mock getPackageJson
			const getPackageJsonMock = mock.module("@expo/config", () => ({
				getPackageJson: () => ({
					dependencies: { "expo-dev-client": "1.0.0" },
					devDependencies: {},
				}),
			}));

			const result = utils.detectDevClientDependency("/fake/project");

			expect(result).toBe(true);
		});

		test("should return true when expo-dev-client is in devDependencies", () => {
			// Mock getPackageJson
			const getPackageJsonMock = mock.module("@expo/config", () => ({
				getPackageJson: () => ({
					dependencies: {},
					devDependencies: { "expo-dev-client": "1.0.0" },
				}),
			}));

			const result = utils.detectDevClientDependency("/fake/project");

			expect(result).toBe(true);
		});

		test("should return false when expo-dev-client is not in dependencies or devDependencies", () => {
			// Mock getPackageJson
			const getPackageJsonMock = mock.module("@expo/config", () => ({
				getPackageJson: () => ({
					dependencies: {},
					devDependencies: {},
				}),
			}));

			const result = utils.detectDevClientDependency("/fake/project");

			expect(result).toBe(false);
		});
	});

	describe("getBuildCacheDirectory", () => {
		test("should return a path that includes build-run-cache", () => {
			const result = utils.getBuildCacheDirectory();

			expect(result).toContain("build-run-cache");
		});
	});
});
