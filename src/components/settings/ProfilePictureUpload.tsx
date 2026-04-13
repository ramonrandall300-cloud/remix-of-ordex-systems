import { useState, useRef } from "react";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { User } from "@supabase/supabase-js";

interface ProfilePictureUploadProps {
  user: User | null;
  onUpdated: () => void;
}

export function ProfilePictureUpload({ user, onUpdated }: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = (user?.user_metadata?.full_name as string || user?.email || "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase.auth.updateUser({
        data: { avatar_url: urlWithCacheBust },
      });
      if (updateErr) throw updateErr;

      toast.success("Profile picture updated");
      onUpdated();
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!user) return;
    setRemoving(true);
    try {
      // List and remove all avatar files for this user
      const { data: files } = await supabase.storage
        .from("avatars")
        .list(user.id);
      if (files?.length) {
        await supabase.storage
          .from("avatars")
          .remove(files.map((f) => `${user.id}/${f.name}`));
      }

      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: null },
      });
      if (error) throw error;

      toast.success("Profile picture removed");
      onUpdated();
    } catch (err) {
      toast.error(`Failed to remove: ${(err as Error).message}`);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        <Avatar className="h-16 w-16 border-2 border-border">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt="Profile" />
          ) : null}
          <AvatarFallback className="text-lg font-semibold bg-primary/20 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload photo"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={removeAvatar}
              disabled={removing}
              className="text-xs text-destructive hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              {removing ? "Removing…" : "Remove"}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Max 2 MB.</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadAvatar(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
