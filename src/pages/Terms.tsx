import Footer from "@/components/Footer";
import { Dna, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Terms = () => (
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
      <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
      <p className="text-xs text-muted-foreground mb-8">Last updated: April 3, 2026</p>
      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using ORDEX Systems ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Account Responsibilities</h2>
          <p>You are responsible for maintaining the security of your account credentials. You must not share your login details or allow unauthorized access to your organization's data.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Acceptable Use</h2>
          <p>You agree to use the Service only for lawful scientific research purposes. You must not use the platform to process data that violates any applicable laws or regulations, including export controls on biological data.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Credits & Billing</h2>
          <p>Credits are non-refundable once consumed. Billing is handled through Stripe. You are responsible for ensuring your organization has sufficient credits before submitting jobs. Failed jobs due to insufficient credits will not be processed.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Intellectual Property</h2>
          <p>You retain full ownership of all data, sequences, and results generated through the Service. ORDEX Systems claims no intellectual property rights over your research outputs.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Service Availability</h2>
          <p>We strive for high availability but do not guarantee uninterrupted service. Scheduled maintenance windows will be communicated in advance. We are not liable for losses resulting from service downtime.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Limitation of Liability</h2>
          <p>ORDEX Systems is provided "as is." We are not liable for any indirect, incidental, or consequential damages arising from use of the Service, including but not limited to lost research data or missed deadlines.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time by contacting <a href="mailto:support@ordex-systems.com" className="text-primary hover:underline">support@ordex-systems.com</a>.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">9. Governing Law</h2>
          <p>These terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">10. Contact</h2>
          <p>For questions about these terms, contact <a href="mailto:support@ordex-systems.com" className="text-primary hover:underline">support@ordex-systems.com</a>.</p>
        </section>
      </div>
    </main>
    <Footer />
  </div>
);

export default Terms;
