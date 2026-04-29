const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const monorepoRoot = path.resolve(__dirname, '../..');
config.watchFolders = [__dirname, monorepoRoot];

// The project has packages in both apps/mobile/node_modules/ (workspace-local)
// and the root node_modules/ (for root devDependencies like expo-router, expo).
// When root-linked packages require shared libraries they pick up root copies,
// creating duplicate module instances (two react-native initialisations, two
// copies of react-native-safe-area-context, etc.) which causes:
//   • "TypeError: property is not writable" at startup
//   • "Tried to register two views with the same name …"
//   • "Invalid hook call" from mismatched React instances
//
// Fix: for every bare module specifier (non-relative, non-absolute), start the
// node_modules lookup from apps/mobile/ regardless of where the requiring file
// lives.  Packages present in apps/mobile/node_modules/ are always resolved to
// that single local copy; packages absent there fall through to the root
// node_modules/ as normal.
const localOrigin = path.join(__dirname, 'package.json');

// Node built-ins that don't exist in React Native. Packages like xlsx guard
// these behind lazy getters (get_fs(), get_zlib(), …) that are never invoked
// on the mobile code path, so an empty stub is safe.
const NODE_STUB = path.join(__dirname, 'node-stubs', 'empty.js');
const NODE_BUILTINS = new Set([
  'fs', 'stream', 'zlib', 'crypto', 'http', 'https', 'os',
  'child_process', 'cluster', 'dgram', 'dns', 'net',
  'readline', 'repl', 'tls', 'worker_threads',
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (NODE_BUILTINS.has(moduleName)) {
    return { type: 'sourceFile', filePath: NODE_STUB };
  }
  if (!moduleName.startsWith('.') && !path.isAbsolute(moduleName)) {
    return context.resolveRequest(
      { ...context, originModulePath: localOrigin },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
