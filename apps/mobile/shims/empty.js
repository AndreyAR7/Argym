// Empty shim — replaces Node-only modules (ws, stream, etc.) in the Metro bundler.
// Supabase Realtime uses WebSocket natively in React Native; ws is not needed.
module.exports = {};
