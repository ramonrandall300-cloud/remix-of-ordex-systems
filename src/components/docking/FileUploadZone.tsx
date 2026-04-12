import { useRef, useState } from "react";
import { Upload, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileUploadZoneProps {
  userId: string | undefined;
  accept: string;
  label: string;
  onUploaded: (url: string, fileName: string) => void;
}

export function FileUploadZone({ userId, accept, label, onUploaded }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!userId) {
      toast.error("Please sign in to upload files");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be under 20MB");
      return;
    }

    setUploading(true);
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("docking-files").upload(path, file);

    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("docking-files").getPublicUrl(path);
    setFileName(file.name);
    setUploading(false);
    onUploaded(urlData.publicUrl, file.name);
    toast.success(`Uploaded ${file.name}`);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors cursor-pointer"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {uploading ? (
        <>
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Uploading…</p>
        </>
      ) : fileName ? (
        <>
          <CheckCircle className="w-5 h-5 text-success" />
          <p className="text-xs text-success truncate max-w-full">{fileName}</p>
        </>
      ) : (
        <>
          <Upload className="w-5 h-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">{label}</p>
        </>
      )}
    </div>
  );
}
