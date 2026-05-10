// Metro config — extends Expo's default to allow Metro to bundle files from
// the repo-root `shared/` folder (resolved via babel-plugin-module-resolver
// alias `@shared`). Without `watchFolders`, Metro rejects any absolute path
// that resolves outside the project root, even when alias-rewritten.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');

const config = getDefaultConfig(projectRoot);

// Tell Metro the shared folder is part of the project boundary.
config.watchFolders = [...(config.watchFolders ?? []), sharedRoot];

// Pin node_modules resolution to this project's own — the shared folder has
// none, but being explicit prevents Metro from walking up the tree.
config.resolver = config.resolver ?? {};
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
