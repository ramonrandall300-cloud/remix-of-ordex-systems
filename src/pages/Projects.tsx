import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Upload, Trash2, Search, FolderPlus, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOrgContext } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Project {
  id: string;
  name: string;
  description: string | null;
  org_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  file_type: string;
  file_path: string | null;
  size_bytes: number;
  user_id: string;
  created_at: string;
}

const ALLOWED_EXTENSIONS = [
  ".csv", ".xlsx", ".xls", ".pdf", ".doc", ".docx",
  ".pdb", ".sdf", ".mol2", ".fasta", ".fa",
  ".txt", ".json", ".png", ".jpg", ".jpeg", ".svg",
];

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File must be under 500MB (got ${(file.size / (1024 * 1024)).toFixed(1)}MB)`;
  }
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported file type "${ext}". Accepted: ${ALLOWED_EXTENSIONS.join(", ")}`;
  }
  return null;
}

export default function Projects() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { orgId } = useOrgContext();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("org_id", orgId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: files = [], isLoading: loadingFiles } = useQuery({
    queryKey: ["project-files", selectedProject],
    enabled: !!selectedProject,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", selectedProject!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectFile[];
    },
  });

  const createProject = useMutation({
    mutationFn: async () => {
      if (!user || !orgId) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("projects").insert({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || null,
        org_id: orgId,
        user_id: user.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Project "${data.name}" created`);
      setNewProjectName("");
      setNewProjectDesc("");
      setNewProjectOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project deleted");
      setSelectedProject(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadFile = useCallback(async (file: File) => {
    if (!selectedProject || !user || !orgId) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const toastId = toast.loading(`Uploading ${file.name}…`);

    try {
      const filePath = `${orgId}/${user.id}/${selectedProject}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("results").upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { error: dbErr } = await supabase.from("project_files").insert({
        project_id: selectedProject,
        name: file.name,
        file_type: file.type || "application/octet-stream",
        file_path: filePath,
        size_bytes: file.size,
        user_id: user.id,
      });
      if (dbErr) throw dbErr;

      toast.success(`Uploaded ${file.name}`, { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["project-files", selectedProject] });
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`, { id: toastId });
    }
  }, [selectedProject, user, orgId, queryClient]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const downloadFile = async (file: ProjectFile) => {
    if (!file.file_path) {
      toast.error("No file path available");
      return;
    }
    const { data, error } = await supabase.storage.from("results").createSignedUrl(file.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Failed to generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const deleteFile = async (file: ProjectFile) => {
    try {
      if (file.file_path) {
        await supabase.storage.from("results").remove([file.file_path]);
      }
      const { error } = await supabase.from("project_files").delete().eq("id", file.id);
      if (error) throw error;
      toast.success(`Deleted ${file.name}`);
      queryClient.invalidateQueries({ queryKey: ["project-files", selectedProject] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const filteredProjects = projects.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("projects.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("projects.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setNewProjectOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> {t("projects.newProject")}</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4 glass-card p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t("projects.searchProjects")} className="w-full bg-secondary border border-border rounded-md pl-9 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          </div>

          {loadingProjects ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderPlus className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("projects.noProjects")}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${selectedProject === p.id ? "bg-primary/10 text-primary border border-primary/30" : "text-foreground hover:bg-secondary"}`}
                >
                  <p className="font-medium truncate">{p.name}</p>
                  {p.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(p.updated_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-12 md:col-span-8 glass-card p-4">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderPlus className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="text-foreground font-medium mb-1">{t("projects.selectProject")}</h3>
              <p className="text-sm text-muted-foreground">{t("projects.selectProjectDesc")}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">
                  {projects.find(p => p.id === selectedProject)?.name ?? "Project"}
                </h3>
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" className="hidden" accept={ALLOWED_EXTENSIONS.join(",")} onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-md text-sm text-foreground hover:bg-secondary">
                    <Upload className="w-3.5 h-3.5" /> {t("projects.upload")}
                  </button>
                  <button onClick={() => deleteProject.mutate(selectedProject)} className="flex items-center gap-1.5 border border-destructive/30 px-3 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" /> {t("projects.deleteProject")}
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                Max 500MB · Accepted: CSV, Excel, PDF, Word, PDB, SDF, MOL2, FASTA, TXT, JSON, Images
              </p>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`min-h-[200px] rounded-lg border-2 border-dashed transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}
              >
                {loadingFiles ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{t("projects.noFiles")}</p>
                    <p className="text-xs text-muted-foreground mt-1">Drop files here or click Upload</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {files.map(f => (
                      <div key={f.id} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary/50">
                        <button onClick={() => downloadFile(f)} className="min-w-0 text-left flex-1">
                          <p className="text-sm text-foreground truncate hover:text-primary transition-colors">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{formatSize(f.size_bytes)} • {new Date(f.created_at).toLocaleDateString()}</p>
                        </button>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button onClick={() => downloadFile(f)} className="text-muted-foreground hover:text-primary p-1" title="Download">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteFile(f)} className="text-muted-foreground hover:text-destructive p-1" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("projects.createNewProject")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("projects.projectName")}</label>
              <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder={t("projects.projectNamePlaceholder")} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("projects.descriptionOptional")}</label>
              <input value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} placeholder={t("projects.descriptionPlaceholder")} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createProject.mutate()} disabled={!newProjectName.trim() || createProject.isPending}>
              {createProject.isPending ? t("projects.creating") : t("projects.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
