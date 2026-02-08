import { supabase } from "./supabase";

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
  const [profileRes, grantsRes] = await Promise.all([
    supabase.from("bg_profiles").select("*").eq("id", userId).single(),
    supabase.from("bg_saved_grants").select("*, bg_checklist_items(*)").eq("user_id", userId),
  ]);
  return {
    profile: profileRes.data,
    saved_grants: grantsRes.data || [],
    exported_at: new Date().toISOString(),
  };
}
