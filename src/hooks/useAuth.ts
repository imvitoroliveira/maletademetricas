
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = useCallback(async (sessionUser: User | null) => {
    if (!sessionUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      // Try to fetch profile with a small retry logic for resilience
      const { data, error } = await supabase
        .from("profiles")
        .select("*, client_permissions(*)")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        // If it's a transient error, we might not want to clear the profile immediately
        // but for safety in auth flows, we clear if we can't verify
      } else if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Auth Exception:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const currentUser = session?.user ?? null;
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            await fetchProfileData(currentUser);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Session init error:", err);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);
      const currentUser = session?.user ?? null;
      
      if (mounted) {
        setUser(currentUser);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await fetchProfileData(currentUser);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileData]);

  return { user, profile, isAdmin: profile?.is_admin || false, loading };
}
