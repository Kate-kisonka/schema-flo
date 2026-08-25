const API_URL = import.meta.env?.VITE_API_URL || "";

const MIGRATED_PREFIX = "pg_migrated:";
const CLAIM_KEY = "schema_flo_legacy_data_claim";
const LEGACY_DRAFT_KEY = "diary_draft";
const LEGACY_DATA_KEYS = ["schema_logs", "period_history", "silence_logs"];
const LEGACY_KEYS = [...LEGACY_DATA_KEYS, LEGACY_DRAFT_KEY];
export const LEGACY_IMPORT_CONTRACT = Object.freeze({
  source: "schema-flo-legacy-local-storage",
  confirmedOwnership: true,
  overwriteExisting: false,
});

const migratedKey = (userId) => `${MIGRATED_PREFIX}${userId}`;
const normalizeUserId = (userId) => String(userId);

function migrationError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function readClaim() {
  const raw = localStorage.getItem(CLAIM_KEY);
  if (!raw) return null;

  try {
    const claim = JSON.parse(raw);
    if (!claim?.userId || !claim?.status) {
      return { invalid: true };
    }
    return { ...claim, userId: normalizeUserId(claim.userId) };
  } catch {
    return { invalid: true };
  }
}

function findOtherMigratedUser(userId) {
  const currentUserId = normalizeUserId(userId);
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(MIGRATED_PREFIX)) continue;
    const ownerId = key.slice(MIGRATED_PREFIX.length);
    if (ownerId && ownerId !== currentUserId) return ownerId;
  }
  return null;
}

function parseLegacyArray(key, strict) {
  const raw = localStorage.getItem(key);
  if (raw === null) return { value: [], corrupt: false };

  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error("not an array");
    return { value, corrupt: false };
  } catch {
    if (strict) {
      throw migrationError(`Повреждены локальные данные: ${key}`, "CORRUPT_LEGACY_DATA");
    }
    return { value: [], corrupt: true };
  }
}

function readLegacySnapshot({ strict = true } = {}) {
  const presentKeys = LEGACY_KEYS.filter((key) => localStorage.getItem(key) !== null);
  const diary = parseLegacyArray("schema_logs", strict);
  const periodHistory = parseLegacyArray("period_history", strict);
  const silenceLogs = parseLegacyArray("silence_logs", strict);
  return {
    presentKeys,
    diary: diary.value,
    periodHistory: periodHistory.value,
    silenceLogs: silenceLogs.value,
    hasCorruptData: diary.corrupt || periodHistory.corrupt || silenceLogs.corrupt,
  };
}

function removeLegacyKeys() {
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}

function summaryFromSnapshot(snapshot) {
  return {
    diary: snapshot.diary.length,
    cycles: snapshot.periodHistory.length,
    practices: snapshot.silenceLogs.length,
    hasLegacyDraft: snapshot.presentKeys.includes(LEGACY_DRAFT_KEY),
    hasCorruptData: snapshot.hasCorruptData,
  };
}

export function buildLegacyImportPayload(snapshot) {
  return {
    ...LEGACY_IMPORT_CONTRACT,
    diary: snapshot.diary,
    periodHistory: snapshot.periodHistory,
    silenceLogs: snapshot.silenceLogs,
  };
}

function markDone(userId) {
  localStorage.setItem(migratedKey(userId), "1");
}

function resolvedClaimFor(claim, userId) {
  return claim?.userId === normalizeUserId(userId) && ["imported", "skipped"].includes(claim.status);
}

export function inspectLegacyMigration(userId) {
  if (userId === null || userId === undefined) {
    throw migrationError("Не указан пользователь для миграции", "MISSING_USER");
  }

  const currentFlagKey = migratedKey(userId);
  const currentFlag = localStorage.getItem(currentFlagKey);
  const claim = readClaim();

  if (currentFlag === "1") {
    if (resolvedClaimFor(claim, userId)) removeLegacyKeys();
    return { status: "ready" };
  }

  // Повреждённый флаг не считается завершением и не блокирует повторную проверку.
  if (currentFlag !== null) localStorage.removeItem(currentFlagKey);

  const presentKeys = LEGACY_KEYS.filter((key) => localStorage.getItem(key) !== null);
  if (presentKeys.length === 0) {
    markDone(userId);
    return { status: "ready" };
  }

  const currentUserId = normalizeUserId(userId);
  const otherMigratedUserId = findOtherMigratedUser(userId);
  if (claim?.invalid || (claim?.userId && claim.userId !== currentUserId) || otherMigratedUserId) {
    return {
      status: "owner-mismatch",
      ownerId: claim?.userId || otherMigratedUserId || null,
    };
  }

  const snapshot = readLegacySnapshot({ strict: false });

  return {
    status: "needs-confirmation",
    summary: summaryFromSnapshot(snapshot),
  };
}

async function withLegacyClaimLock(callback) {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("schema-flo-legacy-data-claim", { mode: "exclusive" }, callback);
  }
  return callback();
}

async function assertAccountIsEmpty(token) {
  const paths = ["/api/diary?limit=1&offset=0", "/api/cycle", "/api/practices"];
  const responses = await Promise.all(paths.map((path) => fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })));

  if (responses.some((response) => !response.ok)) {
    throw migrationError("Не удалось проверить существующие данные аккаунта", "PREFLIGHT_FAILED");
  }

  const payloads = await Promise.all(responses.map((response) => response.json()));
  if (payloads.some((payload) => (payload.items || []).length > 0)) {
    throw migrationError("В аккаунте уже есть данные. Импорт остановлен, чтобы ничего не перезаписать.", "ACCOUNT_NOT_EMPTY");
  }
}

export async function importConfirmedLegacyData(userId) {
  return withLegacyClaimLock(async () => {
    const state = inspectLegacyMigration(userId);
    if (state.status === "ready") return state;
    if (state.status !== "needs-confirmation") {
      throw migrationError("Локальные данные уже принадлежат другому аккаунту", "OWNER_MISMATCH");
    }

    const currentUserId = normalizeUserId(userId);
    const claim = {
      userId: currentUserId,
      status: "claimed",
      claimedAt: new Date().toISOString(),
    };
    localStorage.setItem(CLAIM_KEY, JSON.stringify(claim));

    const storedClaim = readClaim();
    if (storedClaim?.userId !== currentUserId || storedClaim.status !== "claimed") {
      throw migrationError("Не удалось закрепить локальные данные за аккаунтом", "CLAIM_FAILED");
    }

    const token = localStorage.getItem("auth_token");
    if (!token) throw migrationError("Сессия истекла. Войдите снова.", "MISSING_TOKEN");

    const snapshot = readLegacySnapshot();
    await assertAccountIsEmpty(token);
    const response = await fetch(`${API_URL}/api/import/local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(buildLegacyImportPayload(snapshot)),
    });

    if (!response.ok) {
      throw migrationError("Сервер не смог безопасно импортировать локальные данные", "IMPORT_FAILED");
    }

    localStorage.setItem(CLAIM_KEY, JSON.stringify({ ...claim, status: "imported" }));
    markDone(userId);
    removeLegacyKeys();
    return { status: "ready" };
  });
}

export function skipLegacyImport(userId) {
  const state = inspectLegacyMigration(userId);
  if (state.status === "ready") return state;

  if (state.status === "owner-mismatch") {
    // Данные другого владельца не удаляем и не перепривязываем.
    markDone(userId);
    return { status: "ready" };
  }

  const claim = {
    userId: normalizeUserId(userId),
    status: "skipped",
    claimedAt: new Date().toISOString(),
  };
  localStorage.setItem(CLAIM_KEY, JSON.stringify(claim));
  markDone(userId);
  removeLegacyKeys();
  return { status: "ready" };
}
