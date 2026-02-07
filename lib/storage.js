const STORAGE_KEY = "bidragsguiden";
const MAX_HISTORY = 20;

function read() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked — silently fail
  }
}

function getDefaults() {
  return {
    currentSession: null, // { answers, result, feedback, refineCount, timestamp }
    history: [],          // [{ answers, result, summary, timestamp, id }]
  };
}

export function loadState() {
  return read() || getDefaults();
}

export function saveSession({ answers, result, feedback, refineCount }) {
  const state = loadState();
  state.currentSession = {
    answers,
    result,
    feedback,
    refineCount,
    timestamp: Date.now(),
  };
  write(state);
}

export function clearCurrentSession() {
  const state = loadState();
  state.currentSession = null;
  write(state);
}

export function getCurrentSession() {
  const state = loadState();
  return state.currentSession;
}

export function saveToHistory({ answers, result }) {
  const state = loadState();

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    answers,
    summary: result.summary,
    benefitCount: result.benefits?.length || 0,
    totalPotential: result.total_potential,
    timestamp: Date.now(),
  };

  // Deduplicate — don't save if identical answers exist in last 5 minutes
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const isDuplicate = state.history.some(
    (h) =>
      h.timestamp > fiveMinAgo &&
      JSON.stringify(h.answers) === JSON.stringify(answers)
  );

  if (!isDuplicate) {
    state.history.unshift(entry);
    state.history = state.history.slice(0, MAX_HISTORY);
    write(state);
  }

  return entry;
}

export function getHistory() {
  const state = loadState();
  return state.history || [];
}

export function deleteHistoryEntry(id) {
  const state = loadState();
  state.history = (state.history || []).filter((h) => h.id !== id);
  write(state);
}

export function clearHistory() {
  const state = loadState();
  state.history = [];
  state.currentSession = null;
  write(state);
}

export function formatTimestamp(ts) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just nu";
  if (diffMin < 60) return `${diffMin} min sedan`;
  if (diffHours < 24) return `${diffHours}h sedan`;
  if (diffDays < 7) return `${diffDays}d sedan`;

  return date.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });
}
