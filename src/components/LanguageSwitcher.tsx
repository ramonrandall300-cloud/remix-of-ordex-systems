import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { languages } from "@/i18n";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const current = languages.find((l) => l.code === i18n.language) ?? languages[0];

  const handleChange = (code: string) => {
    // Replace the lang prefix in the current path
    const currentLang = lang || i18n.language || "en";
    const rest = location.pathname.replace(new RegExp(`^/${currentLang}`), "") || "/";
    const search = location.search;
    const hash = location.hash;
    navigate(`/${code}${rest === "/" ? "" : rest}${search}${hash}`, { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Language"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{current.flag}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {languages.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleChange(l.code)}
            className={`flex items-center gap-2 ${
              i18n.language === l.code ? "bg-primary/10 text-primary" : ""
            }`}
          >
            <span>{l.flag}</span>
            <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
