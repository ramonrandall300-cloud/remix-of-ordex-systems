import Footer from "@/components/Footer";
import { Dna, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const About = () => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Dna className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">ORDEX Systems</span>
        </Link>
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto py-20 px-6">
      <h1 className="text-4xl font-bold mb-6">About Us</h1>
      <div className="prose prose-invert max-w-none text-muted-foreground space-y-4 text-sm leading-relaxed">
        <p>
          ORDEX Systems is a computational biology platform built for modern research teams. We provide
          AI-powered tools for protein structure prediction, molecular docking, and synthetic biology
          design — all within a secure, multi-tenant environment.
        </p>
        <p>
          Our mission is to democratize access to high-performance computing for life science research.
          By combining cloud infrastructure with intuitive interfaces, we enable scientists to focus on
          discovery rather than DevOps.
        </p>
        <p>
          Founded by a team of computational biologists and infrastructure engineers, ORDEX Systems serves
          academic labs, biotech startups, and pharmaceutical companies worldwide.
        </p>
        <p>
          For questions or partnership inquiries, reach us at{" "}
          <a href="mailto:support@ordex-systems.com" className="text-primary hover:underline">
            support@ordex-systems.com
          </a>.
        </p>
      </div>
    </main>
    <Footer />
  </div>
);

export default About;
