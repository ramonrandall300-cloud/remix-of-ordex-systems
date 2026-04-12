import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  FolderOpen,
  CreditCard,
  Users,
  Settings,
  HelpCircle,
  Atom,
  FlaskConical,
  Dna,
  Scissors,
  Microscope,
  Box,
} from "lucide-react";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const pages = [
    { icon: LayoutDashboard, label: t("sidebar.dashboard"), path: "/dashboard" },
    { icon: FolderOpen, label: t("sidebar.projects"), path: "/projects" },
    { icon: CreditCard, label: t("sidebar.billing"), path: "/billing" },
    { icon: Users, label: t("sidebar.team"), path: "/team" },
    { icon: Settings, label: t("sidebar.settings"), path: "/settings" },
    { icon: HelpCircle, label: t("sidebar.help"), path: "/help" },
  ];

  const tools = [
    { icon: Atom, label: t("sidebar.proteinPrediction"), path: "/protein" },
    { icon: FlaskConical, label: t("sidebar.molecularDocking"), path: "/docking" },
    { icon: Dna, label: t("sidebar.synbioDesign"), path: "/synbio" },
    { icon: Scissors, label: t("sidebar.crisprLab"), path: "/crispr" },
    { icon: Microscope, label: t("sidebar.cellcultureAi"), path: "/cell-culture" },
    { icon: Box, label: t("sidebar.viewer3d"), path: "/viewer" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("nav.search") + "..."} />
      <CommandList>
        <CommandEmpty>{t("nav.search")} — no results</CommandEmpty>
        <CommandGroup heading={t("nav.pages", "Pages")}>
          {pages.map((item) => (
            <CommandItem key={item.path} onSelect={() => go(item.path)}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading={t("nav.tools", "Tools")}>
          {tools.map((item) => (
            <CommandItem key={item.path} onSelect={() => go(item.path)}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
