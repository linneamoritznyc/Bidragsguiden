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
      const { data, error } = await supabase
        .from("bg_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (data) {
        setProfile(data);
      } else {
        // Profile missing (trigger may have failed) — create it now
        const meta = authUser.user_metadata || {};
        const { data: newProfile } = await supabase
          .from("bg_profiles")
          .upsert({
            id: authUser.id,
            display_name: meta.full_name || meta.name || null,
            avatar_url: meta.avatar_url || meta.picture || null,
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
          ? `${window.location.origin}/login`
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
    // Delete all user data via RPC
    const { error: rpcError } = await supabase.rpc("delete_user_data", {
      target_user_id: user.id,
    });
    if (rpcError) {
      console.error("Delete data error:", rpcError);
      throw rpcError;
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
