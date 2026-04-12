import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

/** Generate a unique session ID for this browser tab/session */
function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem("ordex_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("ordex_session_id", id);
  }
  return id;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const validationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();

    const registerSession = async () => {
      const deviceInfo = navigator.userAgent.slice(0, 200);
      await (supabase.rpc as any)("register_session", {
        _session_id: sessionId,
        _device_info: deviceInfo,
      });
    };

    const validateSession = async () => {
      const { data: isValid } = await (supabase.rpc as any)("validate_session", {
        _session_id: sessionId,
      });
      if (isValid === false) {
        // Another device signed in — force logout
        if (validationInterval.current) clearInterval(validationInterval.current);
        toast.error("Your session was ended because your account signed in on another device.");
        await supabase.auth.signOut();
      }
    };

    const startSessionValidation = () => {
      // Check every 30 seconds
      if (validationInterval.current) clearInterval(validationInterval.current);
      validationInterval.current = setInterval(validateSession, 10_000);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN" && session?.user) {
        // Register this session — kicks out any previous device
        registerSession();
        startSessionValidation();

        // Audit
        supabase.rpc("log_audit_event", {
          _user_id: session.user.id,
          _action: "auth.signed_in",
          _entity_type: "user",
          _entity_id: session.user.id,
          _details: { provider: session.user.app_metadata?.provider ?? "email" },
        }).then(null, () => {});
      } else if (event === "SIGNED_OUT") {
        if (validationInterval.current) clearInterval(validationInterval.current);
        sessionStorage.removeItem("ordex_session_id");
        sessionStorage.removeItem("ordex_session_id_registered");
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        // If this is a fresh tab (no prior session_id), just register — don't validate
        // This prevents the race where a new device is immediately kicked out
        const isExistingSession = sessionStorage.getItem("ordex_session_id_registered") === "true";
        if (isExistingSession) {
          const { data: isValid } = await (supabase.rpc as any)("validate_session", {
            _session_id: sessionId,
          });
          if (isValid === false) {
            toast.error("Your session was ended because your account signed in on another device.");
            await supabase.auth.signOut();
            return;
          }
        }
        // Register and start polling
        await registerSession();
        sessionStorage.setItem("ordex_session_id_registered", "true");
        startSessionValidation();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (validationInterval.current) clearInterval(validationInterval.current);
    };
  }, []);

  return { user, loading };
}
