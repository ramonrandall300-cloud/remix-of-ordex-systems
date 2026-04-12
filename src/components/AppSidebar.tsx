import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, ChevronDown, ChevronLeft, Cpu, FlaskConical, Dna, Microscope,
  Box, FolderOpen, CreditCard, Settings, Crown, HelpCircle, Users
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export default function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const prefix = lang || "en";
  const [collapsed, setCollapsed] = useState(false);
  const [workflowsOpen, setWorkflowsOpen] = useState(true);
  const { subscribed, tierLabel } = useSubscription();

  const lp = (path: string) => `/${prefix}${path}`;

  const navItems = [
    { label: t("sidebar.dashboard"), icon: LayoutDashboard, path: "/dashboard" },
    {
      label: t("sidebar.workflows"), icon: FlaskConical, children: [
        { label: t("sidebar.proteinPrediction"), path: "/protein-prediction" },
        { label: t("sidebar.molecularDocking"), path: "/molecular-docking" },
        { label: t("sidebar.synbioDesign"), path: "/synbio-design" },
        { label: t("sidebar.crisprLab"), path: "/crispr-lab" },
        { label: t("sidebar.cellcultureAi"), path: "/cellculture-ai" },
      ]
    },
    { label: t("sidebar.viewer3d"), icon: Box, path: "/3d-viewer" },
    { label: t("sidebar.projects"), icon: FolderOpen, path: "/projects" },
    { label: t("sidebar.team"), icon: Users, path: "/team" },
    { label: t("sidebar.billing"), icon: CreditCard, path: "/billing" },
    
    { label: t("sidebar.settings"), icon: Settings, path: "/settings" },
    { label: t("sidebar.help"), icon: HelpCircle, path: "/help" },
  ];

  const isActive = (path: string) => location.pathname === lp(path);
  const isWorkflowActive = navItems[1].children?.some(c => location.pathname === lp(c.path));

  return (
    <aside className={`flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 ${collapsed ? "w-16" : "w-60"} min-h-screen`}>
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <Dna className="w-7 h-7 text-primary shrink-0" />
        {!collapsed && <span className="font-bold text-foreground text-lg tracking-tight">ORDEX Systems</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-sidebar-foreground hover:text-foreground transition-colors">
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setWorkflowsOpen(!workflowsOpen)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${isWorkflowActive ? "text-foreground" : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"}`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${workflowsOpen ? "" : "-rotate-90"}`} />
                    </>
                  )}
                </button>
                {workflowsOpen && !collapsed && (
                  <div className="ml-4 border-l border-sidebar-border pl-4 space-y-0.5">
                    {item.children.map(child => (
                      <Link
                        key={child.path}
                        to={lp(child.path)}
                        className={`block py-2 px-3 text-sm rounded-md transition-colors ${isActive(child.path) ? "bg-sidebar-accent text-foreground" : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"}`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <Link
              key={item.path}
              to={lp(item.path!)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive(item.path!) ? "bg-sidebar-accent text-foreground border-r-2 border-primary" : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <Link
            to={lp("/billing")}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Crown className={`w-3.5 h-3.5 ${subscribed ? "text-primary" : ""}`} />
            <span>{subscribed ? t("sidebar.plan", { tier: tierLabel }) : t("sidebar.freePlan")}</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
