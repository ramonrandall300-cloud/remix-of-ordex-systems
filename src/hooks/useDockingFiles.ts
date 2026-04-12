import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FileCache {
  pdb: string | null;
  sdf: string | null;
}

export function useDockingFiles() {
  const { user } = useAuth();
  const [receptorFile, setReceptorFile] = useState<File | null>(null);
  const [ligandFile, setLigandFile] = useState<File | null>(null);
  const [localPdbContent, setLocalPdbContent] = useState<string | null>(null);
  const [localSdfContent, setLocalSdfContent] = useState<string | null>(null);
  const fileCache = useRef<Map<string, string>>(new Map());

  // Read uploaded files into strings (cached)
  useEffect(() => {
    if (!receptorFile) { setLocalPdbContent(null); return; }
    const key = `receptor_${receptorFile.name}_${receptorFile.size}`;
    if (fileCache.current.has(key)) {
      setLocalPdbContent(fileCache.current.get(key)!);
    } else {
      receptorFile.text().then((text) => {
        fileCache.current.set(key, text);
        setLocalPdbContent(text);
      });
    }
  }, [receptorFile]);

  useEffect(() => {
    if (!ligandFile) { setLocalSdfContent(null); return; }
    const key = `ligand_${ligandFile.name}_${ligandFile.size}`;
    if (fileCache.current.has(key)) {
      setLocalSdfContent(fileCache.current.get(key)!);
    } else {
      ligandFile.text().then((text) => {
        fileCache.current.set(key, text);
        setLocalSdfContent(text);
      });
    }
  }, [ligandFile]);

  // Fetch files from storage for old jobs (cached)
  const fetchStorageFiles = useCallback(async (
    receptorFileUrl: string | null | undefined,
    ligandFileUrl: string | null | undefined
  ): Promise<FileCache> => {
    const fetchFile = async (path: string): Promise<string | null> => {
      if (fileCache.current.has(path)) return fileCache.current.get(path)!;
      try {
        const { data, error } = await supabase.storage.from("docking-files").download(path);
        if (error || !data) return null;
        const text = await data.text();
        fileCache.current.set(path, text);
        return text;
      } catch {
        return null;
      }
    };

    const pdb = receptorFileUrl ? await fetchFile(receptorFileUrl) : null;
    const sdf = ligandFileUrl ? await fetchFile(ligandFileUrl) : null;
    return { pdb, sdf };
  }, []);

  // Upload files to storage with deterministic hash-based paths
  const uploadFiles = useCallback(async (): Promise<{ receptorPath: string | null; ligandPath: string | null }> => {
    let receptorPath: string | null = null;
    let ligandPath: string | null = null;

    if (receptorFile && user) {
      const path = `${user.id}/${crypto.randomUUID()}_receptor.pdb`;
      const { error } = await supabase.storage
        .from("docking-files")
        .upload(path, receptorFile, { upsert: true });
      if (!error) receptorPath = path;
    }

    if (ligandFile && user) {
      const path = `${user.id}/${crypto.randomUUID()}_ligand.sdf`;
      const { error } = await supabase.storage
        .from("docking-files")
        .upload(path, ligandFile, { upsert: true });
      if (!error) ligandPath = path;
    }

    return { receptorPath, ligandPath };
  }, [receptorFile, ligandFile, user]);

  return {
    receptorFile,
    setReceptorFile,
    ligandFile,
    setLigandFile,
    localPdbContent,
    localSdfContent,
    fetchStorageFiles,
    uploadFiles,
  };
}
