import { useCallback } from "react";
import { useNavigate, useParams, NavigateOptions } from "react-router-dom";

export function useLocalizedNavigate() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const prefix = lang || "en";

  return useCallback(
    (path: string, options?: NavigateOptions) => {
      const prefixed = path.startsWith("/") ? `/${prefix}${path}` : path;
      navigate(prefixed, options);
    },
    [navigate, prefix],
  );
}

export function useLocalizedPath() {
  const { lang } = useParams<{ lang: string }>();
  const prefix = lang || "en";

  return useCallback(
    (path: string) => (path.startsWith("/") ? `/${prefix}${path}` : path),
    [prefix],
  );
}
