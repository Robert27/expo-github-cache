/**
 * Type definitions for GitHub cache provider
 *
 * @fileOverview Centralizes type definitions used throughout the application
 * @module types
 */

import type { ResolveRemoteBuildCacheProps } from "@expo/config";

/**
 * Represents the build run options from Expo's configuration
 * Contains platform-specific build configuration settings
 */
export type RunOptions = ResolveRemoteBuildCacheProps["runOptions"];
