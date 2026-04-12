// 3D Structure Viewer Page
import { useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Share2, Download, RotateCcw, ZoomIn, ZoomOut, Maximize2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProteinJobs } from "@/hooks/useProteinJobs";
import { useDockingJobs } from "@/hooks/useDockingJobs";
import { useAuth } from "@/hooks/useAuth";

// Domain hooks
import { use3DMol } from "@/hooks/viewer/use3DMol";
import { useStructureLoader } from "@/hooks/viewer/useStructureLoader";
import { useViewerControls } from "@/hooks/viewer/useViewerControls";
import { useStructureAnalysis } from "@/hooks/viewer/useStructureAnalysis";
import { useAnnotations } from "@/hooks/viewer/useAnnotations";
import { useDockingVisualization } from "@/hooks/viewer/useDockingVisualization";
import { useMultiStructure } from "@/hooks/viewer/useMultiStructure";
import { useMutationSimulator } from "@/hooks/viewer/useMutationSimulator";
import { useResidueAnnotations } from "@/hooks/viewer/useResidueAnnotations";

// Components
import StructureAIExplain from "@/components/viewer/StructureAIExplain";
import SequenceViewer from "@/components/viewer/SequenceViewer";
import AnalysisCharts from "@/components/viewer/AnalysisCharts";
import DockingControls from "@/components/viewer/DockingControls";
import MultiStructurePanel from "@/components/viewer/MultiStructurePanel";
import MutationSimulatorPanel from "@/components/viewer/MutationSimulatorPanel";
import AnnotationPanel from "@/components/viewer/AnnotationPanel";

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function Viewer3D() {
  const { t } = useTranslation();
  const { lang } = useParams();
  const langVal = lang || "en";
  const { user } = useAuth();
  const { data: proteinJobs } = useProteinJobs();
  const { data: dockingJobs } = useDockingJobs();

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Domain hooks
  const { libLoaded, viewerRef } = use3DMol(containerRef);
  const {
    pdbData, pdbFormat, structureName, structureInfo, loading,
    loadRCSB, loadAlphaFold, loadFile, loadFromJob,
  } = useStructureLoader();
  const {
    representation, setRepresentation,
    coloring, setColoring,
    bgTransparency, setBgTransparency,
    spinning, setSpinning,
    zoomIn, zoomOut, resetView, fullscreen,
  } = useViewerControls(viewerRef, containerRef, pdbData, pdbFormat);
  const {
    analysisLoading, rmsdResult, sasaResult, contactMap,
    runRMSD, runSASA, runContactMap,
  } = useStructureAnalysis(pdbData);
  const { noteContent, setNoteContent, saveNote } = useAnnotations(user?.id, structureName);

  // New feature hooks
  const docking = useDockingVisualization(viewerRef, pdbData);
  const multiStructure = useMultiStructure(viewerRef);
  const mutation = useMutationSimulator(pdbData);
  const residueAnnotations = useResidueAnnotations(user?.id, structureName);

  // UI state
  const [pdbId, setPdbId] = useState("");
  const [uniprotId, setUniprotId] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdb");
  const [activeTab, setActiveTab] = useState("info");

  // Handlers
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleExport = useCallback(() => {
    if (!pdbData) return;
    const blob = new Blob([pdbData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (structureName || "structure") + "." + exportFormat;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    toast.success("File downloaded");
  }, [pdbData, structureName, exportFormat]);

  const handleCopyShareLink = useCallback(() => {
    const url = window.location.origin + "/" + langVal + "/3d-viewer?pdb=" + encodeURIComponent(structureName);
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
    setShareOpen(false);
  }, [langVal, structureName]);

  const handleResidueClick = useCallback((resName: string, resNum: number, chain: string) => {
    mutation.selectResidue(resName, resNum, chain);
  }, [mutation]);

  // Completed jobs
  const completedProtein = (proteinJobs || []).filter((j) => j.status === "completed" && j.result_pdb_url);
  const completedDocking = (dockingJobs || []).filter((j) => j.status === "completed" && j.poses);

  const representations = [
    { key: "cartoon", label: "Cartoon" },
    { key: "surface", label: "Surface" },
    { key: "stick", label: "Stick" },
    { key: "sphere", label: "Sphere" },
    { key: "line", label: "Line" },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4 overflow-hidden">
      {/* Left Panel */}
      <div className="w-72 shrink-0 space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-4">
        {/* Load from jobs */}
        {(completedProtein.length > 0 || completedDocking.length > 0) && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Load from completed jobs</label>
            <Select onValueChange={(val) => {
              const parts = val.split(":");
              const idx = parseInt(parts[1], 10);
              if (parts[0] === "protein") {
                const job = completedProtein[idx];
                if (job) loadFromJob(job);
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Select a job..." /></SelectTrigger>
              <SelectContent>
                {completedProtein.map((j, i) => (
                  <SelectItem key={j.id} value={"protein:" + i}>{j.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* RCSB PDB */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">RCSB PDB</label>
          <div className="flex gap-2">
            <Input placeholder="e.g. 1CRN" value={pdbId} onChange={(e) => setPdbId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") loadRCSB(pdbId); }} className="flex-1" />
            <Button size="sm" onClick={() => loadRCSB(pdbId)} disabled={loading || !pdbId.trim()}>Load</Button>
          </div>
        </div>

        {/* AlphaFold */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">AlphaFold</label>
          <div className="flex gap-2">
            <Input placeholder="e.g. P00533" value={uniprotId} onChange={(e) => setUniprotId(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") loadAlphaFold(uniprotId); }} className="flex-1" />
            <Button size="sm" onClick={() => loadAlphaFold(uniprotId)} disabled={loading || !uniprotId.trim()}>Load</Button>
          </div>
        </div>

        {/* File upload */}
        <div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload File
          </Button>
        </div>

        {/* Representation */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Representation</label>
          <div className="grid grid-cols-3 gap-1">
            {representations.map((r) => (
              <Button key={r.key} size="sm" variant={representation === r.key ? "default" : "outline"} className="text-xs" onClick={() => setRepresentation(r.key)}>
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Coloring */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Coloring</label>
          <Select value={coloring} onValueChange={setColoring}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="chain">Chain</SelectItem>
              <SelectItem value="spectrum">Spectrum</SelectItem>
              <SelectItem value="bfactor">B-Factor</SelectItem>
              <SelectItem value="ss">Secondary Structure</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <ToggleSwitch label={t("viewer3dPage.transparentBg")} checked={bgTransparency} onChange={setBgTransparency} />
          <ToggleSwitch label={t("viewer3dPage.autoRotate")} checked={spinning} onChange={setSpinning} />
        </div>
      </div>

      {/* Center: 3D Viewport + Sequence Strip */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {/* 3D Viewport */}
        <div className="relative flex-1 rounded-lg border border-border bg-card overflow-hidden">
          <div ref={containerRef} className="h-full w-full" />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!pdbData && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Maximize2 className="mb-3 h-12 w-12 opacity-40" />
              <p className="text-sm">{t("viewer3dPage.loadStructure")}</p>
            </div>
          )}

          {pdbData && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              <Button size="icon" variant="secondary" onClick={zoomIn} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
              <Button size="icon" variant="secondary" onClick={zoomOut} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
              <Button size="icon" variant="secondary" onClick={resetView} title="Reset View"><RotateCcw className="h-4 w-4" /></Button>
              <Button size="icon" variant="secondary" onClick={fullscreen} title="Fullscreen"><Maximize2 className="h-4 w-4" /></Button>
            </div>
          )}

          {pdbData && (
            <div className="absolute top-4 right-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}><Share2 className="mr-1 h-3 w-3" /> {t("viewer3dPage.share")}</Button>
              <Button size="sm" variant="outline" onClick={() => setExportOpen(true)}><Download className="mr-1 h-3 w-3" /> {t("viewer3dPage.export")}</Button>
            </div>
          )}
        </div>

        {/* Sequence Strip */}
        {pdbData && (
          <div className="rounded-lg border border-border bg-card p-3 max-h-36 overflow-y-auto">
            <SequenceViewer
              pdbData={pdbData}
              selectedResidue={mutation.selectedResidue}
              onResidueClick={handleResidueClick}
              viewerRef={viewerRef}
            />
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="w-80 shrink-0 overflow-y-auto rounded-lg border border-border bg-card p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 h-auto gap-0.5 p-1">
            <TabsTrigger value="info" className="text-[10px] px-1.5">{t("viewer3dPage.tabs.info")}</TabsTrigger>
            <TabsTrigger value="analysis" className="text-[10px] px-1.5">{t("viewer3dPage.tabs.analysis")}</TabsTrigger>
            <TabsTrigger value="docking" className="text-[10px] px-1.5">{t("viewer3dPage.tabs.docking")}</TabsTrigger>
            <TabsTrigger value="mutate" className="text-[10px] px-1.5">{t("viewer3dPage.tabs.mutate")}</TabsTrigger>
            <TabsTrigger value="align" className="text-[10px] px-1.5">{t("viewer3dPage.tabs.align")}</TabsTrigger>
            <TabsTrigger value="annotate" className="text-[10px] px-1.5">{t("viewer3dPage.tabs.pins")}</TabsTrigger>
            <TabsTrigger value="ai" className="text-[10px] px-1.5">{t("viewer3dPage.tabs.ai")}</TabsTrigger>
            <TabsTrigger value="notes" className="text-[10px] px-1.5">{t("viewer3dPage.tabs.notes")}</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="mt-4 space-y-3">
            {structureName ? (
              <>
                <div><p className="text-xs text-muted-foreground">Structure</p><p className="text-sm font-medium">{structureName}</p></div>
                {structureInfo && (
                  <>
                    <div><p className="text-xs text-muted-foreground">Atoms</p><p className="text-sm font-medium">{structureInfo.atoms?.toLocaleString() ?? "0"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Residues</p><p className="text-sm font-medium">{structureInfo.residues?.toLocaleString() ?? "0"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Chains</p><p className="text-sm font-medium">{structureInfo.chains?.join(", ") ?? "\u2014"}</p></div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("viewer3dPage.noStructure")}</p>
            )}
          </TabsContent>

          {/* Analysis Tab — with charts */}
          <TabsContent value="analysis" className="mt-4 space-y-3">
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="flex-1 text-[10px]" disabled={!pdbData || analysisLoading === "rmsd"} onClick={runRMSD}>
                {analysisLoading === "rmsd" ? <Loader2 className="h-3 w-3 animate-spin" /> : "RMSD"}
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-[10px]" disabled={!pdbData || analysisLoading === "sasa"} onClick={runSASA}>
                {analysisLoading === "sasa" ? <Loader2 className="h-3 w-3 animate-spin" /> : "SASA"}
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-[10px]" disabled={!pdbData || analysisLoading === "contact"} onClick={runContactMap}>
                {analysisLoading === "contact" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Contact"}
              </Button>
            </div>

            {/* Visual charts */}
            <AnalysisCharts rmsdResult={rmsdResult} sasaResult={sasaResult} contactMap={contactMap} />

            {/* Contact map canvas */}
            {contactMap && (
              <div className="p-2 rounded-md bg-secondary">
                <div className="text-[11px] text-muted-foreground mb-1">Contact Map ({contactMap.labels.length} residues)</div>
                <div className="overflow-auto max-h-48">
                  <canvas
                    ref={(canvas) => {
                      if (!canvas || !contactMap) return;
                      const n = contactMap.matrix.length;
                      const scale = Math.max(1, Math.min(Math.floor(200 / n), 6));
                      canvas.width = n * scale;
                      canvas.height = n * scale;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      for (let i = 0; i < n; i++) {
                        for (let j = 0; j < n; j++) {
                          const dist = contactMap.matrix[i][j];
                          if (dist < 8) {
                            const intensity = Math.max(0, Math.min(255, Math.round(255 - (dist / 8) * 200)));
                            ctx.fillStyle = `rgb(${255 - intensity},${intensity},${Math.round(intensity * 0.7)})`;
                          } else {
                            ctx.fillStyle = "#1a1a2e";
                          }
                          ctx.fillRect(j * scale, i * scale, scale, scale);
                        }
                      }
                    }}
                    style={{ imageRendering: "pixelated", width: "100%", maxWidth: 200 }}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Docking Tab */}
          <TabsContent value="docking" className="mt-4">
            <DockingControls
              dockingActive={docking.dockingActive}
              viewMode={docking.viewMode}
              setViewMode={docking.setViewMode}
              showHBonds={docking.showHBonds}
              setShowHBonds={docking.setShowHBonds}
              showDistances={docking.showDistances}
              setShowDistances={docking.setShowDistances}
              showBindingEnergy={docking.showBindingEnergy}
              setShowBindingEnergy={docking.setShowBindingEnergy}
              bestScore={docking.bestScore}
              poses={docking.poses}
              selectedPose={docking.selectedPose}
              setSelectedPose={docking.setSelectedPose}
            />
          </TabsContent>

          {/* Mutation Tab */}
          <TabsContent value="mutate" className="mt-4">
            <MutationSimulatorPanel
              pdbData={pdbData}
              selectedResidue={mutation.selectedResidue}
              targetResidue={mutation.targetResidue}
              setTargetResidue={mutation.setTargetResidue}
              mutationResult={mutation.mutationResult}
              mutationHistory={mutation.mutationHistory}
              simulateMutation={mutation.simulateMutation}
              aminoAcids={mutation.aminoAcids}
            />
          </TabsContent>

          {/* Align Tab */}
          <TabsContent value="align" className="mt-4">
            <MultiStructurePanel
              secondName={multiStructure.secondName}
              alignmentResult={multiStructure.alignmentResult}
              overlayVisible={multiStructure.overlayVisible}
              loadSecondStructure={multiStructure.loadSecondStructure}
              removeSecondStructure={multiStructure.removeSecondStructure}
              toggleOverlay={multiStructure.toggleOverlay}
            />
          </TabsContent>

          {/* Annotations Tab */}
          <TabsContent value="annotate" className="mt-4">
            <AnnotationPanel
              pdbId={structureName}
              annotations={residueAnnotations.annotations}
              loading={residueAnnotations.loading}
              selectedResidue={mutation.selectedResidue}
              addAnnotation={residueAnnotations.addAnnotation}
              updateAnnotation={residueAnnotations.updateAnnotation}
              deleteAnnotation={residueAnnotations.deleteAnnotation}
              viewerRef={viewerRef}
            />
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="mt-4">
            <StructureAIExplain pdbData={pdbData} structureName={structureName} structureInfo={structureInfo} />
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-4 space-y-3">
            <Textarea placeholder="Add notes about this structure..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={8} />
            <Button className="w-full" onClick={saveNote} disabled={!structureName || !noteContent}>
              <Save className="mr-2 h-4 w-4" /> Save Note
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Structure</DialogTitle>
            <DialogDescription>Copy a link to this structure view.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={window.location.origin + "/" + langVal + "/3d-viewer?pdb=" + encodeURIComponent(structureName)} className="flex-1" />
            <Button onClick={handleCopyShareLink}>Copy</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Structure</DialogTitle>
            <DialogDescription>Download the current structure file.</DialogDescription>
          </DialogHeader>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pdb">PDB</SelectItem>
              <SelectItem value="cif">CIF</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle component                                                   */
/* ------------------------------------------------------------------ */
function ToggleSwitch(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-foreground">{props.label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        onClick={() => props.onChange(!props.checked)}
        className={"relative inline-flex h-5 w-9 items-center rounded-full transition-colors " + (props.checked ? "bg-primary" : "bg-muted")}
      >
        <span className={"inline-block h-3.5 w-3.5 rounded-full bg-background transition-transform " + (props.checked ? "translate-x-[18px]" : "translate-x-[2px]")} />
      </button>
    </label>
  );
}
