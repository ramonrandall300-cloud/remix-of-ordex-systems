import React from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dna } from "lucide-react";

const Footer = React.forwardRef<HTMLElement>((_, ref) => {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const prefix = lang || "en";
  const lp = (path: string) => `/${prefix}${path}`;

  return (
    <footer className="border-t border-border bg-card py-12 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <Link to={lp("/")} className="flex items-center gap-2 mb-3">
            <Dna className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">ORDEX Systems</span>
          </Link>
          <p className="text-sm text-muted-foreground">{t("footer.tagline")}</p>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-4">{t("footer.product")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href={`/${prefix}/#features`} className="hover:text-foreground transition-colors">{t("nav.features")}</a></li>
            <li><a href={`/${prefix}/#how-it-works`} className="hover:text-foreground transition-colors">{t("nav.howItWorks")}</a></li>
            <li><a href={`/${prefix}/#pricing`} className="hover:text-foreground transition-colors">{t("nav.pricing")}</a></li>
            <li><a href={`/${prefix}/#faq`} className="hover:text-foreground transition-colors">{t("nav.faq")}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-4">{t("footer.company")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to={lp("/about")} className="hover:text-foreground transition-colors">{t("footer.aboutUs")}</Link></li>
            <li>
              <a href="mailto:support@ordex-systems.com" className="hover:text-foreground transition-colors">
                {t("footer.contact")}: support@ordex-systems.com
              </a>
            </li>
            <li><Link to={lp("/privacy")} className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link></li>
            <li><Link to={lp("/terms")} className="hover:text-foreground transition-colors">{t("footer.terms")}</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        {t("footer.rights", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
