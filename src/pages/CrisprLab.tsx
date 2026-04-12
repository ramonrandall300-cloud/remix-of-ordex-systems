import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ToolPageSkeleton } from "@/components/ToolPageSkeleton";
import { ToolPageError } from "@/components/ToolPageError";
import {
  useCrisprExperiments,
  useCrisprGuides,
  useCrisprLogs,
  useCrisprRealtime,
  type CrisprGuideDesign,
} from "@/hooks/useCrisprExperiments";
import { useOrgContext } from "@/contexts/OrgContext";
import { useCredits } from "@/hooks/useCredits";
import { useCrisprActions } from "@/hooks/useCrisprActions";

import { ExperimentList } from "@/components/crispr/ExperimentList";
import { ExperimentSummary } from "@/components/crispr/ExperimentSummary";
import { StatusControls } from "@/components/crispr/StatusControls";
import { GuideDesigner } from "@/components/crispr/GuideDesigner";
import { VersionTimeline } from "@/components/crispr/VersionTimeline";
import { ComparePanel } from "@/components/crispr/ComparePanel";
import { AuditLog } from "@/components/crispr/AuditLog";
import { GuideOptimizer } from "@/components/crispr/GuideOptimizer";
import { CrisprAnalyticsDashboard } from "@/components/crispr/AnalyticsDashboard";
import { CrisprLabReport } from "@/components/crispr/CrisprLabReport";

type TabKey = "designer" | "timeline" | "compare" | "notebook" | "optimize" | "analytics" | "report";

const TABS: { key: TabKey; label: string }[] = [
  { key: "designer", label: "Designer" },
  { key: "optimize", label: "Optimizer" },
  { key: "timeline", label: "Versions" },
  { key: "compare", label: "Compare" },
  { key: "analytics", label: "Analytics" },
  { key: "notebook", label: "Audit" },
  { key: "report", label: "Report" },
];

export default function CrisprLab() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("designer");
  const [selectedExpId, setSelectedExpId] = useState<string>();
  const [selectedGuide, setSelectedGuide] = useState<CrisprGuideDesign | null>(null);

  const {
    data: experiments = [],
    isLoading,
    isError,
    refetch,
  } = useCrisprExperiments();
  const { data: guides = [] } = useCrisprGuides(selectedExpId);
  const { data: logs = [] } = useCrisprLogs(selectedExpId);
  useCrisprRealtime(selectedExpId);

  const { orgId } = useOrgContext();
  const { data: creditData } = useCredits(orgId);
  const creditBalance = creditData?.balance ?? 0;

  const actions = useCrisprActions();
  const selectedExp = experiments.find((e) => e.id === selectedExpId);

  if (isLoading) return <ToolPageSkeleton columns={1} />;
  if (isError)
    return (
      <ToolPageError
        title="Failed to load experiments"
        message="We couldn't load your CRISPR experiments. Please try again."
        onRetry={() => refetch()}
      />
    );

  const tabContent = selectedExpId && selectedExp ? (
    <>
      {activeTab === "designer" && (
        <GuideDesigner
          experiment={selectedExp}
          guides={guides}
          selectedGuide={selectedGuide}
          creditBalance={creditBalance}
          isSubmitting={actions.isSubmittingGuide}
          onSubmitGuide={actions.handleSubmitGuide}
        />
      )}
      {activeTab === "optimize" && (
        <GuideOptimizer
          experiment={selectedExp as any}
          currentGuide={selectedGuide as any}
          creditBalance={creditBalance}
        />
      )}
      {activeTab === "timeline" && (
        <VersionTimeline
          guides={guides}
          selectedGuideId={selectedGuide?.id}
          onSelectGuide={(g) => {
            setSelectedGuide(g);
            setActiveTab("designer");
          }}
        />
      )}
      {activeTab === "compare" && <ComparePanel guides={guides} />}
      {activeTab === "analytics" && (
        <CrisprAnalyticsDashboard
          experiments={experiments as any[]}
          allGuides={guides as any[]}
        />
      )}
      {activeTab === "notebook" && (
        <AuditLog
          logs={logs}
          experimentId={selectedExpId}
          selectedGuideId={selectedGuide?.id}
          onAddLog={actions.handleAddLog}
          isAdding={actions.isAddingLog}
        />
      )}
      {activeTab === "report" && (
        <CrisprLabReport
          experiment={selectedExp as any}
          guides={guides as any[]}
          logs={logs as any[]}
        />
      )}
    </>
  ) : null;

  return (
    <div className="min-h-screen bg-background text-foreground px-4 pt-6 pb-12">
      <div className="mb-7 max-w-7xl mx-auto">
        <h1 className="text-[22px] font-extrabold m-0">{t("tools.crispr.title")}</h1>
        <p className="mt-1.5 text-primary text-[12px]">{t("tools.crispr.subtitle")}</p>
      </div>

      <div className="max-w-7xl mx-auto lg:flex lg:gap-6">
        {/* Left sidebar: experiment list */}
        <div className="lg:w-[340px] lg:flex-shrink-0">
          <ExperimentList
            experiments={experiments}
            selectedExpId={selectedExpId}
            onSelect={(id) => {
              setSelectedExpId(id);
              setSelectedGuide(null);
            }}
            onDelete={async (id) => {
              const ok = await actions.handleDeleteExperiment(id);
              if (ok && selectedExpId === id) {
                setSelectedExpId(undefined);
                setSelectedGuide(null);
              }
              return ok;
            }}
            onCreate={actions.handleCreateExperiment}
            isCreating={actions.isCreatingExp}
          />
        </div>

        {/* Main content area */}
        {selectedExpId && selectedExp && (
          <div className="flex-1 min-w-0">
            <ExperimentSummary experiment={selectedExp} guides={guides} logs={logs} />

            <StatusControls
              currentStatus={selectedExp.status}
              onStatusChange={(s) =>
                actions.handleStatusChange(selectedExpId, selectedExp.status, s)
              }
              isPending={actions.isUpdatingStatus}
            />

            {/* Tab bar */}
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 py-2.5 px-2 border-none rounded-lg cursor-pointer text-[11px] font-bold transition-all duration-150 whitespace-nowrap ${
                    activeTab === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tabContent}
          </div>
        )}
      </div>
    </div>
  );
}
