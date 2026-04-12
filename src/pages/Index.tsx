import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const prefix = lang || "en";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(`/${prefix}/dashboard`, { replace: true });
      } else {
        navigate(`/${prefix}`, { replace: true });
      }
    });
  }, [navigate, prefix]);

  return null;
}
