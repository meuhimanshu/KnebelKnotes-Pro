import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type Profile = {
  id: string;
  role: "super_admin" | "sub_admin" | "member" | null;
  full_name: string | null;
  username: string | null;
  email: string | null;
  profile_image_path: string | null;
  created_at: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error) {
        console.error("Failed to load auth session", error.message);
      }
      setSession(data.session ?? null);
      setSessionLoading(false);
    };

    void loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setSessionLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!session?.user?.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, full_name, username, email, profile_image_path, created_at")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error.message);
      setProfile(null);
    } else {
      setProfile(data ?? null);
    }
    setProfileLoading(false);
  };

  useEffect(() => {
    void refreshProfile();
  }, [session?.user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading: sessionLoading || profileLoading,
      signIn: async (identifier: string, password: string) => {
        const normalized = identifier.trim();
        let email = normalized;

        if (!normalized.includes("@")) {
          const { data, error } = await supabase
            .from("profiles")
            .select("email")
            .eq("username", normalized)
            .maybeSingle();

          if (error) {
            return { error: error.message };
          }

          if (!data?.email) {
            return { error: "No account found for that username." };
          }

          email = data.email;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
          setProfile(null);
        }
        return error ? { error: error.message } : {};
      },
      refreshProfile,
    }),
    [session, profile, sessionLoading, profileLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
