# Expo GitHub Cache Example

This is a basic example of how to use the Expo GitHub Cache plugin in your Expo project. This plugin allows you to cache your build artifacts on GitHub, which can significantly speed up your build times by reusing previously built artifacts.

> [!NOTE]
> Obviously this plugin does not support Expo Go, as it requires a custom build process. It is designed to work with the `expo run:ios` and `expo run:android` commands.

## Get Started
The app.json defines the configuration for the Expo GitHub Cache plugin. It specifies a demo organization and repository where the build cache will be stored. The `owner` and `repo` fields should be replaced with your actual GitHub organization and repository names.

```json
{
  "expo": {
    "experiments": {
      "remoteBuildCache": {
        "provider": {
          "plugin": "@eggl-js/expo-github-cache",
          "options": {
            "owner": "demo-org",
            "repo": "demo-repo"
          }
        }
      }
    }
  }
}
```

Also provide GitHub authentication using one of:

- `GITHUB_TOKEN` or `GH_TOKEN` environment variable
- `gh auth login` (uses your local GitHub CLI session)

```bash
export GITHUB_TOKEN=your_github_token_here
# or: gh auth login
```

Install dependencies, then start the Expo project. Native `ios/` and `android/` folders are generated locally on first run. The build cache will be automatically used during the build process:

```bash
npm install
npx expo run:ios
npx expo run:android
```