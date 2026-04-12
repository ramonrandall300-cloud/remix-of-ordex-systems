import { useState } from "react";
import { Building2, ChevronDown, Check, Plus } from "lucide-react";
import { useOrgContext } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function OrgSwitcher() {
  const { orgs, activeOrg, switchOrg } = useOrgContext();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!orgName.trim()) { toast.error("Enter an organization name"); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-organization", {
        body: { name: orgName.trim() },
      });
      if (error) {
        // Try to extract the real error from the response body
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) throw new Error(body.error);
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message !== error.message) throw parseErr;
        }
        throw error;
      }
      toast.success(`"${orgName.trim()}" created!`);
      setOrgName("");
      setDialogOpen(false);
      // Refresh orgs list, then switch to new org
      await queryClient.invalidateQueries({ queryKey: ["user-orgs"] });
      if (data?.id) switchOrg(data.id);
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  const trigger = (
    <button className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-md text-sm font-medium hover:bg-primary/30 transition-colors">
      <Building2 className="w-4 h-4" />
      <span className="hidden sm:inline truncate max-w-[140px]">
        {activeOrg?.org_name ?? "Select org"}
      </span>
      <ChevronDown className="w-3 h-3 hidden sm:block" />
    </button>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {orgs.map((org) => (
            <DropdownMenuItem
              key={org.org_id}
              onClick={() => switchOrg(org.org_id)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{org.org_name}</span>
                <span className="text-xs text-muted-foreground">{org.role}</span>
              </div>
              {org.org_id === activeOrg?.org_id && (
                <Check className="w-4 h-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block text-sm font-medium text-foreground">
              Organization Name
            </label>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. My Lab"
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
