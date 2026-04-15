const STORAGE_KEYS = {
  workspace: "vlog-spark-lab:workspace",
  sessionApiKey: "vlog-spark-lab:session-api-key"
};

function safeRead(storage, key) {
  try {
    return storage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function safeWrite(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch (_error) {
    // Ignore storage quota and browser restrictions.
  }
}

function safeRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch (_error) {
    // Ignore browser restrictions.
  }
}

export function loadWorkspaceSnapshot() {
  const raw = safeRead(window.localStorage, STORAGE_KEYS.workspace);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

export function persistWorkspaceSnapshot(state) {
  const snapshot = {
    savedAt: new Date().toISOString(),
    devConfig: {
      preset: state.devConfig.preset,
      provider: state.devConfig.provider,
      model: state.devConfig.model,
      baseURL: state.devConfig.baseURL,
      backendEndpoint: state.devConfig.backendEndpoint,
      mockFallback: false,
      rememberApiKeyInSession: state.devConfig.rememberApiKeyInSession
    },
    profile: state.profile,
    filters: state.filters,
    references: state.references,
    ideas: state.ideas,
    outputs: state.outputs
  };

  safeWrite(window.localStorage, STORAGE_KEYS.workspace, JSON.stringify(snapshot));
}

export function clearWorkspaceSnapshot() {
  safeRemove(window.localStorage, STORAGE_KEYS.workspace);
}

export function loadSessionApiKey() {
  return safeRead(window.sessionStorage, STORAGE_KEYS.sessionApiKey) || "";
}

export function persistSessionApiKey(apiKey, enabled) {
  if (!enabled || !apiKey) {
    safeRemove(window.sessionStorage, STORAGE_KEYS.sessionApiKey);
    return;
  }

  safeWrite(window.sessionStorage, STORAGE_KEYS.sessionApiKey, apiKey);
}

export function clearSessionApiKey() {
  safeRemove(window.sessionStorage, STORAGE_KEYS.sessionApiKey);
}

export function exportConnectionConfig(devConfig) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          preset: devConfig.preset,
          provider: devConfig.provider,
          model: devConfig.model,
          baseURL: devConfig.baseURL,
          backendEndpoint: devConfig.backendEndpoint,
          mockFallback: false
        },
        null,
        2
      )
    ],
    {
      type: "application/json;charset=utf-8"
    }
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `vlog-ai-connection-config-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importConnectionConfig(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);

  return {
    preset: String(parsed.preset || "").trim(),
    provider: String(parsed.provider || "").trim(),
    model: String(parsed.model || "").trim(),
    baseURL: String(parsed.baseURL || "").trim(),
    backendEndpoint: String(parsed.backendEndpoint || "/api/generate").trim() || "/api/generate",
    mockFallback: false
  };
}
