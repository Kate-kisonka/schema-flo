const LEGACY_SESSION_STORAGE_KEY = "ai_sessions";
const CLEANUP_DONE_KEY = "schema_flo_cleanup_ai_sessions_v1";

export function cleanupLegacyAISessions() {
  try {
    if (localStorage.getItem(CLEANUP_DONE_KEY) === "1") return false;
    localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
    localStorage.setItem(CLEANUP_DONE_KEY, "1");
    return true;
  } catch {
    return false;
  }
}
