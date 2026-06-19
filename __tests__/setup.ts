import { mock } from "bun:test";
import * as spawnAsyncModule from "@expo/spawn-async";

const realSpawn = spawnAsyncModule.default || spawnAsyncModule;

// Prevent tests from using the developer's local `gh auth login` session.
mock.module("@expo/spawn-async", () => ({
	default: async (command: string, args: string[], options?: unknown) => {
		if (command === "gh" && args[0] === "auth" && args[1] === "token") {
			throw new Error("gh not authenticated");
		}

		return realSpawn(command, args, options as Parameters<typeof realSpawn>[2]);
	},
}));
