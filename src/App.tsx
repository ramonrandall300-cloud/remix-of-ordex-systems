// App root
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import LanguageRouter from "./components/LanguageRouter";
import { OrgProvider } from "./contexts/OrgContext";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Dashboard from "./pages/Dashboard";
import ProteinPrediction from "./pages/ProteinPrediction";
import MolecularDocking from "./pages/MolecularDocking";
import SynBioDesign from "./pages/SynBioDesign";
import CrisprLab from "./pages/CrisprLab";
import CellCultureAI from "./pages/CellCultureAI";
import Viewer3D from "./pages/Viewer3D";
import Projects from "./pages/Projects";
import Team from "./pages/Team";

import BillingUsage from "./pages/BillingUsage";

import SettingsPage from "./pages/Settings";
import ChoosePlan from "./pages/ChoosePlan";
import HelpSupport from "./pages/HelpSupport";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Language-prefixed routes */}
          <Route path="/:lang" element={<LanguageRouter />}>
            <Route index element={<Landing />} />
            <Route path="about" element={<About />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="auth" element={<Auth />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route path="choose-plan" element={<OrgProvider><ChoosePlan /></OrgProvider>} />
              <Route element={<OrgProvider><AppLayout /></OrgProvider>}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="protein-prediction" element={<ProteinPrediction />} />
                <Route path="molecular-docking" element={<MolecularDocking />} />
                <Route path="synbio-design" element={<SynBioDesign />} />
                <Route path="crispr-lab" element={<CrisprLab />} />
                <Route path="cellculture-ai" element={<CellCultureAI />} />
                <Route path="3d-viewer" element={<Viewer3D />} />
                <Route path="projects" element={<Projects />} />
                <Route path="team" element={<Team />} />
                <Route path="billing" element={<BillingUsage />} />
                
                <Route path="settings" element={<SettingsPage />} />
                <Route path="help" element={<HelpSupport />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
          {/* Root → detect language and redirect */}
          <Route path="/" element={<LanguageRouter />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
