import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, FlaskConical, Atom, Dna, Scissors, Microscope, Box, Mail, ExternalLink } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left text-foreground hover:bg-secondary/50 transition-colors"
          >
            {open === i ? <ChevronDown className="w-4 h-4 shrink-0 text-primary" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
            <span className="font-medium">{item.q}</span>
          </button>
          {open === i && (
            <div className="px-4 pb-3 pl-10 text-sm text-muted-foreground leading-relaxed">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const toolKeys = ["protein", "docking", "synbio", "crispr", "cellculture", "viewer"] as const;
const toolIcons: Record<string, React.ReactNode> = {
  protein: <FlaskConical className="w-5 h-5 text-primary" />,
  docking: <Atom className="w-5 h-5 text-primary" />,
  synbio: <Dna className="w-5 h-5 text-primary" />,
  crispr: <Scissors className="w-5 h-5 text-primary" />,
  cellculture: <Microscope className="w-5 h-5 text-primary" />,
  viewer: <Box className="w-5 h-5 text-primary" />,
};

export default function HelpSupport() {
  const { t } = useTranslation();

  const generalFaqs: FaqItem[] = Array.from({ length: 6 }, (_, i) => ({
    q: t(`help.general.q${i + 1}`),
    a: t(`help.general.a${i + 1}`),
  }));

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("tools.help.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("tools.help.subtitle")}</p>
      </div>

      <section className="glass-card p-5 space-y-4">
        <h2 className="font-semibold text-foreground text-lg">{t("tools.help.general")}</h2>
        <p className="text-sm text-muted-foreground">{t("tools.help.generalDesc")}</p>
        <FaqAccordion items={generalFaqs} />
      </section>

      {toolKeys.map((key) => {
        const faqs: FaqItem[] = Array.from({ length: 5 }, (_, i) => ({
          q: t(`help.${key}.q${i + 1}`),
          a: t(`help.${key}.a${i + 1}`),
        }));
        return (
          <section key={key} className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              {toolIcons[key]}
              <h2 className="font-semibold text-foreground text-lg">{t(`help.${key}.title`)}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t(`help.${key}.desc`)}</p>
            <FaqAccordion items={faqs} />
          </section>
        );
      })}

      <section className="glass-card p-6 space-y-3 border-primary/20">
        <h2 className="font-semibold text-foreground text-lg">{t("tools.help.needHelp")}</h2>
        <p className="text-sm text-muted-foreground">{t("tools.help.needHelpDesc")}</p>
        <a
          href="mailto:support@ordex-systems.com"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Mail className="w-4 h-4" />
          support@ordex-systems.com
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </a>
      </section>
    </div>
  );
}
