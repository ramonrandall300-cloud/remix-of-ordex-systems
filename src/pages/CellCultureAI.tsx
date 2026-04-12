import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Microscope } from "lucide-react";
import { useOrgContext } from "@/contexts/OrgContext";
import { useCredits } from "@/hooks/useCredits";
import {
  useCellCultures,
  useCultureLogs,
  useCultureAnalyses,
  useCreateCulture,
  useAddCultureLog,
  useRunCultureAnalysis,
  useUpdateCulture,
  useDeleteCulture,
} from "@/hooks/useCellCultures";
import { useCultureForm } from "@/hooks/useCultureForms";
import { useObservationForm } from "@/hooks/useCultureForms";
import { ToolPageSkeleton } from "@/components/ToolPageSkeleton";
import { ToolPageError } from "@/components/ToolPageError";

import { CultureList, CultureEmptyState } from "@/components/cell-culture/CultureList";
import { CultureDetail } from "@/components/cell-culture/CultureDetail";
import { CreateCultureDialog } from "@/components/cell-culture/CreateCultureDialog";
import { EditCultureDialog } from "@/components/cell-culture/EditCultureDialog";
import { ObservationLogs } from "@/components/cell-culture/ObservationLogs";
import { AnalysisPanel } from "@/components/cell-culture/AnalysisPanel";
import { AnalysisResult } from "@/components/cell-culture/AnalysisResult";
import { GrowthCharts } from "@/components/cell-culture/GrowthCharts";
import { CultureAIChat } from "@/components/cell-culture/CultureAIChat";
import { CultureAlerts } from "@/components/cell-culture/CultureAlerts";
import { QuickActionBar } from "@/components/cell-culture/QuickActionBar";
import { CultureComparison } from "@/components/cell-culture/CultureComparison";
import { CultureLabReport } from "@/components/cell-culture/CultureLabReport";
import { toast } from "sonner";

export default function CellCultureAI() {
  const { t } = useTranslation();
  const { orgId } = useOrgContext();
  const { data: credits } = useCredits(orgId);
  const balance = credits?.balance ?? 0;

  const { data: cultures = [], isLoading, isError, refetch } = useCellCultures();
  const createCulture = useCreateCulture();
  const updateCulture = useUpdateCulture();
  const deleteCulture = useDeleteCulture();
  const addLog = useAddCultureLog();
  const runAnalysis = useRunCultureAnalysis();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => cultures.find((c: any) => c.id === selectedId), [cultures, selectedId]);
  const [activeTab, setActiveTab] = useState("observations");

  const { data: logs = [] } = useCultureLogs(selectedId ?? undefined);
  const { data: analyses = [] } = useCultureAnalyses(selectedId ?? undefined);

  const editForm = useCultureForm();
  const obsForm = useObservationForm();

  const openEdit = () => {
    if (!selected) return;
    editForm.openWith({
      name: selected.name,
      cell_line: selected.cell_line,
      passage_number: String(selected.passage_number),
      seeding_density: selected.seeding_density || "1e5 cells/mL",
      medium: selected.medium,
      temperature: String(selected.temperature),
      co2_percent: String(selected.co2_percent),
      humidity: String(selected.humidity),
      notes: selected.notes || "",
      status: selected.status,
    });
  };

  const handleEdit = () => {
    if (!selectedId || !editForm.form.name.trim()) return;
    updateCulture.mutate(
      { id: selectedId, ...editForm.parsed },
      { onSuccess: () => editForm.setOpen(false) },
    );
  };

  const handleCreate = (values: any) => {
    if (!orgId) return;
    createCulture.mutate({ ...values, org_id: orgId });
  };

  const handleLog = () => {
    if (!selectedId) return;
    addLog.mutate(
      { culture_id: selectedId, ...obsForm.parsed() },
      { onSuccess: () => obsForm.reset() },
    );
  };

  const handleDelete = () => {
    if (!selectedId) return;
    deleteCulture.mutate(selectedId, { onSuccess: () => setSelectedId(null) });
  };

  const handlePassage = () => {
    if (!selectedId || !selected) return;
    updateCulture.mutate({
      id: selectedId,
      passage_number: selected.passage_number + 1,
    });
    toast.success(`Passaged to P${selected.passage_number + 1}`);
  };

  const handleMarkContaminated = () => {
    if (!selectedId) return;
    updateCulture.mutate({ id: selectedId, status: "contaminated" });
    toast.warning("Culture marked as contaminated");
  };

  if (isLoading) return <ToolPageSkeleton columns={2} />;
  if (isError) return <ToolPageError title="Failed to load cultures" message="We couldn't load your cell cultures. Please try again." onRetry={() => refetch()} />;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Microscope className="w-6 h-6 text-primary" /> {t("tools.cellculture.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("tools.cellculture.subtitle")}</p>
        </div>
        <CreateCultureDialog
          onSubmit={handleCreate}
          isPending={createCulture.isPending}
          triggerLabel={t("tools.cellculture.newCulture")}
        />
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <CultureList
          cultures={cultures as any[]}
          selectedId={selectedId}
          onSelect={setSelectedId}
          label={t("tools.cellculture.yourCultures")}
        />

        {selected ? (
          <div className="space-y-4">
            <CultureAlerts logs={logs as any[]} culture={selected as any} />

            <CultureDetail
              culture={selected as any}
              onEdit={openEdit}
              onDelete={handleDelete}
              isDeleting={deleteCulture.isPending}
            />

            <QuickActionBar
              onLogObservation={() => {
                setActiveTab("observations");
                obsForm.setOpen(true);
              }}
              onPassage={handlePassage}
              onMarkContaminated={handleMarkContaminated}
              onRunAnalysis={() => setActiveTab("analysis")}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="observations">Observations</TabsTrigger>
                <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
                <TabsTrigger value="chat">AI Chat</TabsTrigger>
                <TabsTrigger value="compare">Compare</TabsTrigger>
                <TabsTrigger value="report">Report</TabsTrigger>
              </TabsList>

              <TabsContent value="observations" className="space-y-4">
                <GrowthCharts logs={logs as any[]} />
                <ObservationLogs
                  logs={logs as any[]}
                  form={obsForm.form}
                  onChange={obsForm.update}
                  onSubmit={handleLog}
                  isPending={addLog.isPending}
                  dialogOpen={obsForm.open}
                  onDialogChange={obsForm.setOpen}
                />
              </TabsContent>

              <TabsContent value="analysis">
                <AnalysisPanel
                  balance={balance}
                  onAnalysis={(type) => selectedId && runAnalysis.mutate({ cultureId: selectedId, analysisType: type })}
                  isPending={runAnalysis.isPending}
                />
                {analyses.length > 0 && <AnalysisResult analysis={analyses[0]} />}
              </TabsContent>

              <TabsContent value="chat" className="mt-3">
                <CultureAIChat cultureId={selectedId!} cultureName={selected.name} />
              </TabsContent>

              <TabsContent value="compare" className="mt-3">
                <CultureComparison cultures={cultures as any[]} />
              </TabsContent>

              <TabsContent value="report" className="mt-3 space-y-3">
                <CultureLabReport culture={selected as any} logs={logs as any[]} analyses={analyses as any[]} />
                {analyses.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground">Analysis History</h3>
                    {analyses.map((a: any) => <AnalysisResult key={a.id} analysis={a} compact />)}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <CultureEmptyState />
        )}
      </div>

      <EditCultureDialog
        open={editForm.open}
        onOpenChange={editForm.setOpen}
        form={editForm.form}
        onChange={editForm.update}
        onSubmit={handleEdit}
        isPending={updateCulture.isPending}
      />
    </div>
  );
}
