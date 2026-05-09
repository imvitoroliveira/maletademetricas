
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sessionUser: User | null) => {
    if (!sessionUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, client_permissions(*)")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async (sessionUser: User | null) => {
      if (!sessionUser) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      try {
        console.log("Fetching profile for:", sessionUser.email);
        const { data, error } = await supabase
          .from("profiles")
          .select("*, client_permissions(*)")
          .eq("id", sessionUser.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
          if (mounted) setProfile(null);
        } else {
          console.log("Profile data received:", data);
          if (mounted) setProfile(data);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        if (mounted) setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      if (mounted) setUser(currentUser);
      await fetchProfile(currentUser);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.email);
      const currentUser = session?.user ?? null;
      if (mounted) setUser(currentUser);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (mounted) setLoading(true);
        await fetchProfile(currentUser);
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, profile, isAdmin: profile?.is_admin || false, loading };
}
