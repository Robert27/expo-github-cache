# Expo GitHub Cache

A remote build cache provider plugin for Expo that uses GitHub Releases to store and retrieve cached build artifacts, dramatically accelerating your local development workflow.

## What is this?

This library implements Expo's [remote build cache provider interface](https://docs.expo.dev/guides/cache-builds-remotely/) using GitHub Releases as the storage backend. Build caching is an experimental Expo feature that speeds up `npx expo run:ios` and `npx expo run:android` commands by caching builds remotely based on your project's [fingerprint](https://docs.expo.dev/versions/latest/sdk/fingerprint/).

### How it works with Expo's caching system

When you run local development builds with `npx expo run:[android|ios]`, this plugin:

1. **Checks for existing builds**: Searches GitHub Releases for a cached build matching your project's current fingerprint
2. **Downloads if available**: If a matching build exists, downloads and launches it instead of compiling from scratch  
3. **Uploads new builds**: If no cache exists, compiles normally and uploads the resulting binary to GitHub Releases for future use

This integration with Expo's build caching system can save significant time during development, especially for large projects or when switching between branches with similar dependencies. Instead of waiting for full compilation every time, you can reuse previously built binaries when your project's fingerprint hasn't changed.

## Installation

To install the Expo GitHub Cache plugin, you can use a package manager like npm or bun. This plugin is available as an NPM package, making it easy to integrate into your Expo project.

```bash
npm install @eggl-js/expo-github-cache --save-dev
```
or

```bash
bun add @eggl-js/expo-github-cache -d
```

> [!TIP]
>
> If you prefer to use the GitHub NPM registry, you can install the package directly from there:
> ```bash
> npm install @robert27/expo-github-cache --registry=https://npm.pkg.github.com
> ```

## Configuration

### 1. Set up GitHub Token

Create a GitHub Personal Access Token with `repo` permissions and set it as an environment variable:

```bash
export GITHUB_TOKEN=your_github_token_here
```

### 2. Configure your Expo project

Add the build cache provider to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "experiments": {
       "remoteBuildCache": {
            "provider": {
                "plugin": "@eggl-js/expo-github-cache",
                "options": {
                    "owner": "demo-org",
                    "repo": "demo-repo",
                }
            }
        }
    }
  }
}
```

### 3. Usage

Now when you run your Expo commands, the cache will automatically be used:

```bash
npx expo run:ios
npx expo run:android
```

## How it works

The plugin uses your project's [fingerprint hash](https://docs.expo.dev/versions/latest/sdk/fingerprint/) to create unique tags in GitHub Releases. Each build artifact is stored as a release asset with a tag like:

- `fingerprint.abc123def456.ios` - iOS production build
- `fingerprint.abc123def456.dev-client.android` - Android development client build

When you run a build command, the plugin:

1. Calculates your project's current fingerprint
2. Searches for a GitHub Release with the matching tag
3. Downloads the cached build if found, or compiles and uploads if not

## Requirements

- Node.js 18 or higher
- GitHub repository with release permissions
- GitHub Personal Access Token with `repo` scope
- Expo project with fingerprinting enabled

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token with repo permissions |

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## When to use this vs. the base example

This plugin extends the functionality of Expo's [basic GitHub cache provider example](https://github.com/expo/examples/tree/master/with-github-remote-build-cache-provider). Here's when to use each:

**Use the base example if:**
- You want a simple, minimal implementation to understand the concepts
- You prefer to copy and customize the code directly in your project
- You need a starting point for building your own custom cache provider

**Use this plugin if:**
- You want a production-ready, installable package and want to keep your project clean
- You prefer npm/bun package management over copying files
- You want additional features like comprehensive error handling and logging
- You need a maintained solution with tests and CI/CD

Both implement the same Expo remote build cache provider interface, so they're functionally equivalent at the core level.

## License

MIT