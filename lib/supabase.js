import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars not set — cloud features disabled");
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: "implicit",
          detectSessionInUrl: true,
          autoRefreshToken: true,
          persistSession: true,
        },
      })
    : null;

// Session ID stored in a cookie (persists across tabs/refreshes)
const SESSION_KEY = "bg_session_id";

function getStoredSessionId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

function storeSessionId(id) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, id);
}

// Get or create an anonymous session
export async function getSession() {
  if (!supabase) return null;

  const existingId = getStoredSessionId();

  if (existingId) {
    // Verify it still exists and update last_active
    const { data } = await supabase
      .from("bg_sessions")
      .update({ last_active: new Date().toISOString() })
      .eq("id", existingId)
      .select("id")
      .single();

    if (data) return data.id;
  }

  // Create new session
  const { data, error } = await supabase
    .from("bg_sessions")
    .insert({})
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create session:", error);
    return null;
  }

  storeSessionId(data.id);
  return data.id;
}

// Save a search (quiz answers + AI result)
export async function saveSearch({ sessionId, answers, result, refineCount }) {
  if (!supabase || !sessionId) return null;

  const { data, error } = await supabase
    .from("bg_searches")
    .insert({
      session_id: sessionId,
      answers,
      result,
      refine_count: refineCount || 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save search:", error);
    return null;
  }

  return data.id;
}

// Update an existing search (after refinement)
export async function updateSearch({ searchId, result, refineCount }) {
  if (!supabase || !searchId) return;

  const { error } = await supabase
    .from("bg_searches")
    .update({
      result,
      refine_count: refineCount,
    })
    .eq("id", searchId);

  if (error) {
    console.error("Failed to update search:", error);
  }
}

// Save feedback on a specific grant
export async function saveFeedback({ searchId, benefitIndex, benefitName, eligible, reason }) {
  if (!supabase || !searchId) return;

  const { error } = await supabase
    .from("bg_feedback")
    .upsert(
      {
        search_id: searchId,
        benefit_index: benefitIndex,
        benefit_name: benefitName,
        eligible,
        reason: reason || null,
      },
      { onConflict: "search_id,benefit_index" }
    );

  if (error) {
    console.error("Failed to save feedback:", error);
  }
}

// Delete feedback (when user un-toggles)
export async function deleteFeedback({ searchId, benefitIndex }) {
  if (!supabase || !searchId) return;

  const { error } = await supabase
    .from("bg_feedback")
    .delete()
    .eq("search_id", searchId)
    .eq("benefit_index", benefitIndex);

  if (error) {
    console.error("Failed to delete feedback:", error);
  }
}

// Get search history for a session
export async function getSearchHistory(sessionId) {
  if (!supabase || !sessionId) return [];

  const { data, error } = await supabase
    .from("bg_searches")
    .select("id, answers, result, refine_count, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Failed to load history:", error);
    return [];
  }

  return data || [];
}

// Get a single search with its feedback
export async function getSearchWithFeedback(searchId) {
  if (!supabase || !searchId) return null;

  const [searchRes, feedbackRes] = await Promise.all([
    supabase
      .from("bg_searches")
      .select("*")
      .eq("id", searchId)
      .single(),
    supabase
      .from("bg_feedback")
      .select("*")
      .eq("search_id", searchId),
  ]);

  if (searchRes.error) return null;

  return {
    ...searchRes.data,
    feedback: feedbackRes.data || [],
  };
}

// Save email signup for reminders
export async function saveEmailSignup({ sessionId, email, answers }) {
  if (!supabase) return;

  const { error } = await supabase
    .from("bg_email_signups")
    .insert({
      session_id: sessionId || null,
      email,
      answers: answers || null,
    });

  if (error) {
    console.error("Failed to save email signup:", error);
    throw error;
  }
}

// Delete a search (cascades to feedback)
export async function deleteSearch(searchId) {
  if (!supabase || !searchId) return;

  const { error } = await supabase
    .from("bg_searches")
    .delete()
    .eq("id", searchId);

  if (error) {
    console.error("Failed to delete search:", error);
  }
}

// Delete all searches for a session
export async function clearAllSearches(sessionId) {
  if (!supabase || !sessionId) return;

  const { error } = await supabase
    .from("bg_searches")
    .delete()
    .eq("session_id", sessionId);

  if (error) {
    console.error("Failed to clear history:", error);
  }
}
