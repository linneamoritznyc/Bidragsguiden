import { supabase } from "./supabase";

// --- Quiz profile: save & retrieve user's quiz answers ---
export async function saveQuizAnswers({ userId, answers, kommun }) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from("bg_profiles")
    .update({
      quiz_answers: { ...answers, kommun: kommun || null },
      last_search_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) console.error("Failed to save quiz answers:", error);
}

export async function getQuizAnswers(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("bg_profiles")
    .select("quiz_answers, last_search_at")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("Failed to load quiz answers:", error);
    return null;
  }
  return data;
}

// --- User search history (for logged-in users) ---
export async function saveUserSearch({ userId, answers, result, kommun, refineCount }) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("bg_user_searches")
    .insert({
      user_id: userId,
      answers,
      result,
      kommun: kommun || null,
      refine_count: refineCount || 0,
    })
    .select("id")
    .single();
  if (error) {
    console.error("Failed to save user search:", error);
    return null;
  }
  return data?.id;
}

export async function getUserSearches(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("bg_user_searches")
    .select("id, answers, result, kommun, refine_count, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("Failed to load user searches:", error);
    return [];
  }
  return data || [];
}

export async function deleteUserSearch(searchId) {
  if (!supabase || !searchId) return;
  const { error } = await supabase
    .from("bg_user_searches")
    .delete()
    .eq("id", searchId);
  if (error) console.error("Failed to delete user search:", error);
}

// Saved grants CRUD
export async function getSavedGrants(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("bg_saved_grants")
    .select("*, bg_checklist_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load saved grants:", error);
    return [];
  }
  return data || [];
}

export async function saveGrant({ userId, grant }) {
  if (!supabase || !userId) return null;

  // Check if this grant already exists for this user (avoid duplicates)
  const { data: existing } = await supabase
    .from("bg_saved_grants")
    .select("id")
    .eq("user_id", userId)
    .eq("grant_name", grant.name)
    .maybeSingle();

  if (existing) return existing.id; // Already saved, skip

  const { data, error } = await supabase
    .from("bg_saved_grants")
    .insert({
      user_id: userId,
      grant_name: grant.name,
      grant_agency: grant.agency,
      grant_data: grant,
      status: "new",
      deadline: null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("Failed to save grant:", error);
    return null;
  }
  // Auto-create checklist items from the grant data
  const items = [];
  if (grant.required_docs) {
    items.push({ label: `Samla dokument: ${grant.required_docs}`, sort_order: 0 });
  }
  if (grant.how_to_apply) {
    items.push({ label: `Ansök: ${grant.how_to_apply}`, sort_order: 1 });
  }
  if (grant.url) {
    items.push({ label: `Läs mer: ${grant.url}`, sort_order: 2 });
  }
  items.push({ label: "Kontrollera att utlysningen fortfarande är öppen", sort_order: 3 });

  if (items.length > 0) {
    await supabase.from("bg_checklist_items").insert(
      items.map((item) => ({
        saved_grant_id: data.id,
        user_id: userId,
        ...item,
      }))
    );
  }
  return data.id;
}

export async function updateGrantStatus({ grantId, status }) {
  if (!supabase) return;
  const { error } = await supabase
    .from("bg_saved_grants")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", grantId);
  if (error) console.error("Failed to update grant status:", error);
}

export async function updateGrantNotes({ grantId, notes }) {
  if (!supabase) return;
  const { error } = await supabase
    .from("bg_saved_grants")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", grantId);
  if (error) console.error("Failed to update grant notes:", error);
}

export async function updateGrantDeadline({ grantId, deadline }) {
  if (!supabase) return;
  const { error } = await supabase
    .from("bg_saved_grants")
    .update({ deadline, updated_at: new Date().toISOString() })
    .eq("id", grantId);
  if (error) console.error("Failed to update deadline:", error);
}

export async function deleteSavedGrant(grantId) {
  if (!supabase) return;
  const { error } = await supabase
    .from("bg_saved_grants")
    .delete()
    .eq("id", grantId);
  if (error) console.error("Failed to delete grant:", error);
}

export async function deleteSavedGrantByName({ userId, grantName }) {
  if (!supabase || !userId || !grantName) return;
  const { error } = await supabase
    .from("bg_saved_grants")
    .delete()
    .eq("user_id", userId)
    .eq("grant_name", grantName);
  if (error) console.error("Failed to delete grant by name:", error);
}

// Checklist CRUD
export async function toggleChecklistItem({ itemId, done }) {
  if (!supabase) return;
  const { error } = await supabase
    .from("bg_checklist_items")
    .update({ done })
    .eq("id", itemId);
  if (error) console.error("Failed to toggle checklist:", error);
}

export async function addChecklistItem({ savedGrantId, userId, label }) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("bg_checklist_items")
    .insert({ saved_grant_id: savedGrantId, user_id: userId, label, sort_order: 99 })
    .select("*")
    .single();
  if (error) {
    console.error("Failed to add checklist item:", error);
    return null;
  }
  return data;
}

export async function deleteChecklistItem(itemId) {
  if (!supabase) return;
  const { error } = await supabase
    .from("bg_checklist_items")
    .delete()
    .eq("id", itemId);
  if (error) console.error("Failed to delete checklist item:", error);
}

// Export all user data (GDPR)
export async function exportUserData(userId) {
  if (!supabase || !userId) return null;
  const [profileRes, grantsRes, searchesRes, usageRes] = await Promise.all([
    supabase.from("bg_profiles").select("*").eq("id", userId).single(),
    supabase.from("bg_saved_grants").select("*, bg_checklist_items(*)").eq("user_id", userId),
    supabase.from("bg_user_searches").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("bg_usage").select("*").eq("user_id", userId).order("used_at", { ascending: false }),
  ]);
  return {
    profile: profileRes.data,
    saved_grants: grantsRes.data || [],
    search_history: searchesRes.data || [],
    usage_history: usageRes.data || [],
    exported_at: new Date().toISOString(),
  };
}
