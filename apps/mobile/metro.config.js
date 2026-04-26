const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Prevent Metro from watching the monorepo root node_modules (doesn't exist)
config.watchFolders = [__dirname];

module.exports = config;
