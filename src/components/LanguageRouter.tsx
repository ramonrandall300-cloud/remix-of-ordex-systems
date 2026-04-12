import { useEffect } from "react";
import { Outlet, useParams, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { languages } from "@/i18n";

const VALID_CODES = languages.map((l) => l.code);
const DOMAIN = "https://ordex-systems.com";

export default function LanguageRouter() {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const location = useLocation();

  const isValid = lang && VALID_CODES.includes(lang as any);

  useEffect(() => {
    if (isValid && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    if (isValid) {
      document.documentElement.lang = lang!;
    }
  }, [lang, isValid, i18n]);

  // Add / update hreflang tags
  useEffect(() => {
    if (!isValid) return;
    const subPath = location.pathname.replace(`/${lang}`, "") || "/";

    // Remove old hreflang links
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());

    VALID_CODES.forEach((code) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = code;
      link.href = `${DOMAIN}/${code}${subPath === "/" ? "" : subPath}`;
      document.head.appendChild(link);
    });

    // x-default
    const xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.hreflang = "x-default";
    xDefault.href = `${DOMAIN}/en${subPath === "/" ? "" : subPath}`;
    document.head.appendChild(xDefault);
  }, [lang, location.pathname, isValid]);

  if (!isValid) {
    // Detect preferred language or default to en
    const detected = i18n.language?.split("-")[0];
    const target = VALID_CODES.includes(detected as any) ? detected : "en";
    const rest = location.pathname + location.search + location.hash;
    return <Navigate to={`/${target}${rest}`} replace />;
  }

  return <Outlet />;
}
