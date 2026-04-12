import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Beaker,
  Cpu,
  FlaskConical,
  ArrowRight,
  Star,
  Upload,
  Settings2,
  BarChart3,
  Check,
  Zap,
  Dna,
  Box,
} from "lucide-react";
import Footer from "@/components/Footer";
import { Entropy } from "@/components/ui/entropy";
import { DotCard } from "@/components/ui/dot-card";
import ComparisonChart from "@/components/landing/ComparisonChart";
import LandingChatbot from "@/components/LandingChatbot";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const testimonials = [
  {
    name: "Dr. Sarah Chen",
    role: "Computational Biologist, GeneTech Labs",
    quote:
      "Ordex cut our protein folding pipeline from weeks to hours. The automated docking workflows are a game-changer for our drug-discovery team.",
    rating: 5,
    avatar: "/testimonials/sarah.jpeg",
  },
  {
    name: "Prof. Marcus Rivera",
    role: "Director of Synthetic Biology, MIT",
    quote:
      "The multi-tenant architecture means every lab in our department can work independently with strict data isolation. Security we can actually trust.",
    rating: 5,
    avatar: "/testimonials/marcus.jpeg",
  },
  {
    name: "Anika Patel",
    role: "CTO, BioForge Therapeutics",
    quote:
      "We evaluated five platforms before choosing Ordex. The credit-based pricing and real-time job monitoring made the decision easy.",
    rating: 5,
    avatar: "/testimonials/anika.jpeg",
  },
];

const faqs = [
  {
    q: "What types of computations does Ordex support?",
    a: "Ordex supports protein structure prediction (ESMFold & AlphaFold 2 via the AlphaFold DB API), molecular docking (AutoDock Vina), and synthetic biology design including codon optimization and plasmid assembly.",
  },
  {
    q: "How does the credit system work?",
    a: "Credits are purchased per-organization and consumed based on job complexity and compute time. You can monitor usage in real time and set budget alerts.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. Every organization is fully isolated with Row Level Security, encrypted storage, and audit logs. We never share data between tenants.",
  },
  {
    q: "How does billing work?",
    a: "Choose a monthly plan (Starter, Professional, or Elite) to get compute credits. You can also purchase additional credit packs anytime. Cancel or change your plan from the billing page.",
  },
  {
    q: "How is job processing handled?",
    a: "Jobs are processed through our cloud infrastructure with real-time progress monitoring. Different plans offer varying priority levels for faster queue processing.",
  },
  {
    q: "Do you support batch job submission?",
    a: "Yes — Professional and Elite plans include batch job submission, allowing you to queue multiple docking or prediction jobs at once for higher throughput.",
  },
];

const Landing = () => {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const prefix = lang || "en";
  const lp = (path: string) => `/${prefix}${path}`;

  const featureItems = [
    { icon: FlaskConical, titleKey: "features.protein.title" as const, descKey: "features.protein.desc" as const },
    { icon: Cpu, titleKey: "features.docking.title" as const, descKey: "features.docking.desc" as const },
    { icon: Beaker, titleKey: "features.synbio.title" as const, descKey: "features.synbio.desc" as const },
    { icon: Dna, titleKey: "features.crispr.title" as const, descKey: "features.crispr.desc" as const },
    { icon: FlaskConical, titleKey: "features.cellculture.title" as const, descKey: "features.cellculture.desc" as const },
    { icon: Box, titleKey: "features.viewer.title" as const, descKey: "features.viewer.desc" as const },
  ];

  const steps = [
    { icon: Upload, titleKey: "howItWorks.upload.title" as const, descKey: "howItWorks.upload.desc" as const },
    { icon: Settings2, titleKey: "howItWorks.configure.title" as const, descKey: "howItWorks.configure.desc" as const },
    { icon: BarChart3, titleKey: "howItWorks.analyze.title" as const, descKey: "howItWorks.analyze.desc" as const },
  ];

  const plans = [
    {
      nameKey: "pricing.free.name", descKey: "pricing.free.description",
      price: "$0", period: "", highlighted: false, seatPrice: null,
      features: ["500 free credits", "Full AI analysis suite", "Advanced docking parameters", "All export formats", "Mutation simulator", "Primer design & ORF tools", "Standard processing", "7-day result retention", "Batch jobs & SSO"],
    },
    {
      nameKey: "pricing.starter.name", descKey: "pricing.starter.description",
      price: "$49", period: "perMonth", highlighted: false, seatPrice: "$15",
      features: ["500 compute credits", "Full AI analysis suite", "Advanced docking parameters", "All export formats", "Mutation simulator", "Primer design & ORF tools", "Standard processing", "30-day result retention", "Batch jobs & SSO"],
    },
    {
      nameKey: "pricing.professional.name", descKey: "pricing.professional.description",
      price: "$199", period: "perMonth", highlighted: true, seatPrice: "$25",
      features: ["2,000 compute credits", "Full AI analysis suite", "Advanced docking parameters", "All export formats", "Mutation simulator", "Primer design & ORF tools", "Priority processing", "90-day retention", "Batch jobs & SSO"],
    },
    {
      nameKey: "pricing.elite.name", descKey: "pricing.elite.description",
      price: "$499", period: "perMonth", highlighted: false, seatPrice: "$35",
      features: ["5,000 compute credits", "Full AI analysis suite", "Advanced docking parameters", "All export formats", "Mutation simulator", "Primer design & ORF tools", "Dedicated processing", "365-day retention", "Batch jobs & SSO"],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to={lp("/")} className="flex items-center gap-2">
            <Dna className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">ORDEX Systems</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">{t("nav.features")}</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">{t("nav.howItWorks")}</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</a>
            <a href="#faq" className="hover:text-foreground transition-colors">{t("nav.faq")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to={lp("/auth")}>
              <Button variant="ghost" size="sm">{t("nav.signIn")}</Button>
            </Link>
            <Link to={lp("/auth")}>
              <Button size="sm" className="gap-1">
                {t("nav.getStarted")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <Entropy size={800} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            <Zap className="h-3 w-3 mr-1" /> {t("hero.badge")}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            {t("hero.title")}{" "}
            <span className="text-primary">ORDEX Systems</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to={lp("/auth")}>
              <Button size="lg" className="gap-2">
                {t("nav.getStarted")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline">{t("hero.seeHow")}</Button>
            </a>
          </div>

        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t("features.title")}</h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            {featureItems.map((f) => (
              <DotCard key={f.titleKey}>
                <f.icon className="h-10 w-10 text-primary mb-2" />
                <h3 className="text-lg font-semibold mb-2">{t(f.titleKey)}</h3>
                <p className="text-muted-foreground text-sm">{t(f.descKey)}</p>
              </DotCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t("howItWorks.title")}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.titleKey} className="text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <s.icon className="h-7 w-7 text-primary" />
                </div>
                <p className="text-xs text-primary font-semibold mb-1">{t("howItWorks.step", { n: i + 1 })}</p>
                <h3 className="text-lg font-semibold mb-2">{t(s.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(s.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t("testimonials.title")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((tm) => (
              <Card key={tm.name} className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: tm.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 italic">"{tm.quote}"</p>
                  <div className="flex items-center gap-3">
                    <img src={tm.avatar} alt={tm.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-semibold">{tm.name}</p>
                      <p className="text-xs text-muted-foreground">{tm.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Chart */}
      <ComparisonChart />

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">{t("pricing.title")}</h2>
          <p className="text-center text-muted-foreground mb-12">{t("pricing.subtitle")}</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => (
              <Card
                key={p.nameKey}
                className={`bg-card border-border relative ${p.highlighted ? "ring-2 ring-primary" : ""}`}
              >
                {p.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">{t("pricing.mostPopular")}</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{t(p.nameKey)}</CardTitle>
                  <CardDescription>{t(p.descKey)}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{p.price}</span>
                    {p.period && <span className="text-muted-foreground">{t(`pricing.${p.period}`)}</span>}
                    {p.seatPrice && (
                      <p className="text-xs text-muted-foreground mt-1">+ {p.seatPrice}/seat/month</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={lp("/auth")}>
                    <Button className="w-full" variant={p.highlighted ? "default" : "outline"}>
                      {t("nav.getStarted")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t("faqSection.title")}</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-16 px-6 border-t border-border/50">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-medium text-muted-foreground/50 mb-10 tracking-[0.25em] uppercase">
            Trusted by leading institutions worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-8 md:gap-x-14">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">MIT</span>
            <span className="text-lg md:text-xl font-semibold tracking-wide text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">STANFORD</span>
            <span className="text-xl md:text-2xl font-extrabold tracking-tight text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">NIH</span>
            <span className="text-base md:text-lg font-semibold tracking-widest text-muted-foreground/25 hover:text-muted-foreground/55 transition-colors uppercase">Max Planck</span>
            <span className="text-lg md:text-xl font-bold tracking-tight text-muted-foreground/35 hover:text-muted-foreground/65 transition-colors">ETH Zürich</span>
            <span className="text-base md:text-lg font-semibold tracking-wide text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">HARVARD MEDICAL</span>
          </div>
        </div>
      </section>

      <Footer />
      <LandingChatbot />
    </div>
  );
};

export default Landing;
