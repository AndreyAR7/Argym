// Monorepo root metro config — used when the release build's expo export:embed
// runs with the monorepo root as project root (the RN Gradle Plugin workingDir).
// Delegates entirely to the app's own metro.config.js so all custom resolvers,
// watchFolders, and Node built-in stubs stay in one place.
module.exports = require('./apps/mobile/metro.config.js');
