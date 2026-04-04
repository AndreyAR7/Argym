const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

const emptyShim = path.resolve(projectRoot, 'shims/empty.js');
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ws: emptyShim,
  stream: emptyShim,
  crypto: emptyShim,
  http: emptyShim,
  https: emptyShim,
  net: emptyShim,
  tls: emptyShim,
  zlib: emptyShim,
};

module.exports = config;
