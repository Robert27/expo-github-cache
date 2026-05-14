import { afterEach, describe, expect, test } from "bun:test";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "fs-extra";
import { create as createTar } from "tar";
import { extractAppFromLocalArchiveAsync } from "../src/download";

const tempRoots: string[] = [];

afterEach(async () => {
	for (const root of tempRoots.splice(0)) {
		await fs.remove(root).catch(() => {});
	}
});

async function trackTempDir(): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "eggl-download-test-"));
	tempRoots.push(root);
	return root;
}

async function makeTarGzFromDir(
	sourceDir: string,
	tarPath: string,
): Promise<void> {
	await fs.ensureDir(path.dirname(tarPath));
	const base = path.basename(sourceDir);
	const parent = path.dirname(sourceDir);
	await createTar({ cwd: parent, file: tarPath, gzip: true }, [base]);
}

describe("extractAppFromLocalArchiveAsync", () => {
	test("resolves iOS .app bundle directory inside tarball", async () => {
		const root = await trackTempDir();
		const bundleDir = path.join(root, "build", "Example.app");
		await fs.ensureDir(path.join(bundleDir, "Payload"));
		await fs.writeFile(path.join(bundleDir, "Info.plist"), "<plist/>");

		const tarPath = path.join(root, "archive.tar.gz");
		await makeTarGzFromDir(path.join(root, "build"), tarPath);

		const resolved = await extractAppFromLocalArchiveAsync(tarPath, "ios");

		expect(resolved.endsWith(".app")).toBe(true);
		expect((await fs.stat(resolved)).isDirectory()).toBe(true);
		expect(path.basename(resolved)).toBe("Example.app");
	});

	test("finds nested iOS .app bundle (not only at archive root)", async () => {
		const root = await trackTempDir();
		const bundleDir = path.join(root, "out", "Release", "MyApp.app");
		await fs.ensureDir(bundleDir);
		await fs.writeFile(path.join(bundleDir, "PkgInfo"), "APPL");

		const tarPath = path.join(root, "nested.tar.gz");
		await makeTarGzFromDir(path.join(root, "out"), tarPath);

		const resolved = await extractAppFromLocalArchiveAsync(tarPath, "ios");

		expect(resolved).toContain("MyApp.app");
		expect((await fs.stat(resolved)).isDirectory()).toBe(true);
	});

	test("resolves Android .apk file inside tarball", async () => {
		const root = await trackTempDir();
		const staging = path.join(root, "staging");
		await fs.ensureDir(staging);
		await fs.writeFile(path.join(staging, "app-release.apk"), "fake-apk");

		const tarPath = path.join(root, "android.tar.gz");
		await makeTarGzFromDir(staging, tarPath);

		const resolved = await extractAppFromLocalArchiveAsync(tarPath, "android");

		expect(resolved.endsWith(".apk")).toBe(true);
		expect((await fs.stat(resolved)).isFile()).toBe(true);
	});

	test("throws when iOS tarball has no .app bundle", async () => {
		const root = await trackTempDir();
		const staging = path.join(root, "empty-ios");
		await fs.ensureDir(staging);
		await fs.writeFile(path.join(staging, "readme.txt"), "no app");

		const tarPath = path.join(root, "empty.tar.gz");
		await makeTarGzFromDir(staging, tarPath);

		await expect(
			extractAppFromLocalArchiveAsync(tarPath, "ios"),
		).rejects.toThrow("Did not find any installable apps inside tarball.");
	});

	test("throws when Android tarball has no .apk file", async () => {
		const root = await trackTempDir();
		const staging = path.join(root, "empty-android");
		await fs.ensureDir(staging);
		await fs.writeFile(path.join(staging, "readme.txt"), "no apk");

		const tarPath = path.join(root, "no-apk.tar.gz");
		await makeTarGzFromDir(staging, tarPath);

		await expect(
			extractAppFromLocalArchiveAsync(tarPath, "android"),
		).rejects.toThrow("Did not find any installable apps inside tarball.");
	});

	test("prefers shallowest .app bundle when multiple exist", async () => {
		const root = await trackTempDir();
		const staging = path.join(root, "multi");
		await fs.ensureDir(path.join(staging, "Shallow.app"));
		await fs.writeFile(path.join(staging, "Shallow.app", "Info.plist"), "");
		await fs.ensureDir(path.join(staging, "nested", "Deep.app"));
		await fs.writeFile(
			path.join(staging, "nested", "Deep.app", "Info.plist"),
			"",
		);

		const tarPath = path.join(root, "multi.tar.gz");
		await makeTarGzFromDir(staging, tarPath);

		const resolved = await extractAppFromLocalArchiveAsync(tarPath, "ios");

		expect(path.basename(resolved)).toBe("Shallow.app");
	});

	test("with multiple .app at same depth picks lexicographically first", async () => {
		const root = await trackTempDir();
		const staging = path.join(root, "ties");
		await fs.ensureDir(path.join(staging, "Zebra.app"));
		await fs.ensureDir(path.join(staging, "Apple.app"));
		await fs.writeFile(path.join(staging, "Zebra.app", "Info.plist"), "");
		await fs.writeFile(path.join(staging, "Apple.app", "Info.plist"), "");

		const tarPath = path.join(root, "tie.tar.gz");
		await makeTarGzFromDir(staging, tarPath);

		const resolved = await extractAppFromLocalArchiveAsync(tarPath, "ios");

		expect(path.basename(resolved)).toBe("Apple.app");
	});

	test("ignores regular file named *.app (iOS bundle must be a directory)", async () => {
		const root = await trackTempDir();
		const staging = path.join(root, "bad");
		await fs.ensureDir(staging);
		await fs.writeFile(path.join(staging, "Fake.app"), "not a bundle");

		const tarPath = path.join(root, "fake-app-file.tar.gz");
		await makeTarGzFromDir(staging, tarPath);

		await expect(
			extractAppFromLocalArchiveAsync(tarPath, "ios"),
		).rejects.toThrow("Did not find any installable apps inside tarball.");
	});
});
