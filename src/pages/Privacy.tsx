import Footer from "@/components/Footer";
import { Dna, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Privacy = () => (
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
      <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground mb-8">Last updated: April 3, 2026</p>
      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
          <p>We collect information you provide directly: name, email address, organization details, and payment information. We also collect usage data such as job submissions, API calls, and platform interactions.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve our services, process payments, communicate with you, and ensure the security of our platform. We do not sell your personal data to third parties.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Data Storage & Security</h2>
          <p>All data is encrypted at rest and in transit. We use Row Level Security to ensure strict multi-tenant isolation. Research data is stored in private, organization-scoped storage buckets and is never shared between tenants.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Retention</h2>
          <p>We retain your account information for as long as your account is active. Computation results are retained according to your plan's retention period. You may request deletion of your data at any time.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Third-Party Services</h2>
          <p>We use Stripe for payment processing. Stripe's privacy policy governs the handling of payment information. We do not store full credit card numbers on our servers.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data. You may also request a copy of your data in a portable format. Contact us at <a href="mailto:support@ordex-systems.com" className="text-primary hover:underline">support@ordex-systems.com</a> to exercise these rights.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Changes to This Policy</h2>
          <p>We may update this policy from time to time. We will notify you of significant changes via email or through the platform.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">8. Contact</h2>
          <p>For privacy-related inquiries, contact us at <a href="mailto:support@ordex-systems.com" className="text-primary hover:underline">support@ordex-systems.com</a>.</p>
        </section>
      </div>
    </main>
    <Footer />
  </div>
);

export default Privacy;
