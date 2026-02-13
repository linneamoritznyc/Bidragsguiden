import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  deleteAccount: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Use onAuthStateChange as the single source of truth.
    // It fires INITIAL_SESSION after processing any OAuth callback tokens
    // in the URL (hash fragments), which avoids the race condition where
    // getSession() returns null before the tokens are processed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Safety timeout: if auth state hasn't resolved in 5 seconds, stop loading
    const timeout = setTimeout(() => setLoading(false), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const fetchProfile = async (authUser) => {
    if (!supabase) { setLoading(false); return; }
    try {
      // Check if GDPR consent was just given on the login page
      const consentPending = typeof window !== "undefined"
        && localStorage.getItem("bg_gdpr_consent_pending") === "true";
      if (consentPending) {
        localStorage.removeItem("bg_gdpr_consent_pending");
      }

      const { data, error } = await supabase
        .from("bg_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (data) {
        // Record GDPR consent timestamp if pending and not yet recorded
        if (consentPending && !data.gdpr_consent) {
          await supabase.from("bg_profiles").update({
            gdpr_consent: true,
            gdpr_consent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", authUser.id);
          data.gdpr_consent = true;
          data.gdpr_consent_at = new Date().toISOString();
        }
        setProfile(data);
      } else {
        // Profile missing (trigger may have failed) — create it now
        const meta = authUser.user_metadata || {};
        const { data: newProfile } = await supabase
          .from("bg_profiles")
          .upsert({
            id: authUser.id,
            display_name: meta.full_name || meta.name || null,
            email: authUser.email || null,
            gdpr_consent: consentPending ? true : false,
            gdpr_consent_at: consentPending ? new Date().toISOString() : null,
          }, { onConflict: "id" })
          .select("*")
          .single();
        setProfile(newProfile || null);
      }
    } catch (err) {
      console.error("Profile fetch/create error:", err);
      setProfile(null);
    }
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined,
      },
    });
    if (error) console.error("Sign in error:", error);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates) => {
    if (!supabase || !user) return;
    const { error } = await supabase
      .from("bg_profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) {
      console.error("Update profile error:", error);
      throw error;
    }
    await fetchProfile(user);
  };

  const deleteAccount = async () => {
    if (!supabase || !user) return;
    // Try RPC first; if it doesn't exist, delete tables manually
    const { error: rpcError } = await supabase.rpc("delete_user_data", {
      target_user_id: user.id,
    });
    if (rpcError) {
      console.warn("RPC delete_user_data failed, deleting manually:", rpcError.message);
      // Manual deletion in correct order (checklist items cascade from saved_grants)
      await supabase.from("bg_checklist_items").delete().eq("user_id", user.id);
      await supabase.from("bg_saved_grants").delete().eq("user_id", user.id);
      await supabase.from("bg_user_searches").delete().eq("user_id", user.id);
      await supabase.from("bg_usage").delete().eq("user_id", user.id);
      // bg_events may not exist yet
      await supabase.from("bg_events").delete().eq("user_id", user.id).then(() => {}).catch(() => {});
      await supabase.from("bg_profiles").delete().eq("id", user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, signOut, updateProfile, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
