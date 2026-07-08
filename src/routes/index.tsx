import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Bell,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Users,
  Download,
  UserPlus,
  Sparkles,
  ChevronRight,
  Search,
  Info,
  Mail,
  X,
  FileSpreadsheet,
  Save,
  Upload,
} from "lucide-react";



export const Route = createFileRoute("/")({
  component: Index,
});

type Team = "Equipe A" | "Equipe B" | "Standardistes" | "Service Administratif";
const TEAMS: Team[] = ["Equipe A", "Equipe B", "Standardistes", "Service Administratif"];
const TEAM_SHORT: Record<Team, string> = {
  "Equipe A": "Éq. A",
  "Equipe B": "Éq. B",
  Standardistes: "Standard.",
  "Service Administratif": "Admin.",
};

const MOTIFS = [
  "Congé administratif",
  "Congé maladie",
  "Congé de naissance",
  "Permission",
  "Récupération",
  "Mission",
  "Formation",
  "Autre",
] as const;
type Motif = (typeof MOTIFS)[number];

interface Absence {
  id: string;
  motif: Motif;
  dateDebut: string;
  dateFin: string;
  dateReprise?: string;
  note?: string;
}


interface Person {
  id: string;
  nom: string;
  grade: string;
  ppr: string;
  cin: string;
  team: Team;
  absences: Absence[];
}

const STORAGE_KEY = "conges-personnel-v1";

function loadPeople(): Person[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Person[]) : [];
  } catch {
    return [];
  }
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function fmt(d: string) {
  try {
    return new Date(d).toLocaleDateString("fr-FR");
  } catch {
    return d;
  }
}

function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function repriseOf(a: Absence): string {
  return a.dateReprise || addDaysISO(a.dateFin, 1);
}


function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function csvEscape(v: string) {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const MOTIF_HEX: Record<string, string> = {
  "Congé administratif": "FFDBEAFE",
  "Congé maladie": "FFFECACA",
  "Congé de naissance": "FFFBCFE8",
  Permission: "FFFDE68A",
  Récupération: "FFA7F3D0",
  Mission: "FFC7D2FE",
  Formation: "FFE9D5FF",
  Autre: "FFE2E8F0",
};

async function exportExcel(people: Person[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ayoub Sadkouni";
  wb.created = new Date();

  const ws = wb.addWorksheet("Congés", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  const headers = [
    "Nom",
    "Grade",
    "PPR",
    "CIN",
    "Équipe",
    "Motif",
    "Date début",
    "Date fin",
    "Date reprise",
    "Durée (j)",
    "Note",
  ];

  // Title row
  ws.mergeCells(1, 1, 1, headers.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `Gestion des Congés — Export du ${new Date().toLocaleDateString("fr-FR")}`;
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F766E" },
  };
  ws.getRow(1).height = 32;

  // Subtitle
  ws.mergeCells(2, 1, 2, headers.length);
  const subCell = ws.getCell(2, 1);
  subCell.value = `${people.length} personnel · ${people.reduce((s, p) => s + p.absences.length, 0)} absence(s)`;
  subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF64748B" } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  ws.getRow(2).height = 20;

  // Header row
  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0EA5E9" },
    };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF0369A1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
  headerRow.height = 26;

  // Data rows
  let rowIndex = 4;
  let dataCount = 0;
  for (const p of people) {
    if (p.absences.length === 0) continue;
    for (const a of p.absences) {
      const dur = Math.max(0, daysUntil(a.dateFin) - daysUntil(a.dateDebut)) + 1;
      const row = ws.getRow(rowIndex);
      const values = [
        p.nom,
        p.grade,
        p.ppr,
        p.cin,
        p.team,
        a.motif,
        new Date(a.dateDebut),
        new Date(a.dateFin),
        new Date(repriseOf(a)),
        dur,
        a.note ?? "",
      ];
      values.forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = v as never;
        c.alignment = { vertical: "middle", horizontal: i >= 6 && i <= 9 ? "center" : "left", wrapText: true };
        c.font = { name: "Calibri", size: 10 };
        c.border = {
          top: { style: "hair", color: { argb: "FFE2E8F0" } },
          bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
          left: { style: "hair", color: { argb: "FFE2E8F0" } },
          right: { style: "hair", color: { argb: "FFE2E8F0" } },
        };
        if (dataCount % 2 === 1) {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        }
      });
      // Date formatting
      row.getCell(7).numFmt = "dd/mm/yyyy";
      row.getCell(8).numFmt = "dd/mm/yyyy";
      row.getCell(9).numFmt = "dd/mm/yyyy";
      // Motif colored badge
      const motifCell = row.getCell(6);
      motifCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: MOTIF_HEX[a.motif] ?? "FFE2E8F0" },
      };
      motifCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1E293B" } };
      motifCell.alignment = { vertical: "middle", horizontal: "center" };
      row.height = 22;
      rowIndex++;
      dataCount++;
    }
  }

  // Column widths
  const widths = [24, 20, 12, 12, 20, 22, 13, 13, 13, 10, 30];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  // Empty state
  if (dataCount === 0) {
    ws.mergeCells(4, 1, 4, headers.length);
    const c = ws.getCell(4, 1);
    c.value = "Aucune absence enregistrée.";
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.font = { italic: true, color: { argb: "FF94A3B8" } };
  }

  // Footer
  const footerRow = rowIndex + 1;
  ws.mergeCells(footerRow, 1, footerRow, headers.length);
  const foot = ws.getCell(footerRow, 1);
  foot.value = "Application développée par Ayoub Sadkouni — sadkouni1@gmail.com";
  foot.font = { size: 9, italic: true, color: { argb: "FF94A3B8" } };
  foot.alignment = { horizontal: "center" };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `conges_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function Index() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTeam, setActiveTeam] = useState<Team>("Equipe A");
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [absencePerson, setAbsencePerson] = useState<Person | null>(null);
  const [historyPerson, setHistoryPerson] = useState<Person | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);

  useEffect(() => {
    setPeople(loadPeople());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
  }, [people, loaded]);

  const expiring = useMemo(() => {
    const items: { person: Person; absence: Absence; days: number; reprise: string }[] = [];
    for (const p of people) {
      for (const a of p.absences) {
        const rep = repriseOf(a);
        const d = daysUntil(rep);
        if (d >= 0 && d <= 3) items.push({ person: p, absence: a, days: d, reprise: rep });
      }
    }
    return items.sort((a, b) => a.days - b.days);
  }, [people]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const repriseTodayIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of people) {
      if (p.absences.some((a) => repriseOf(a) === todayStr)) s.add(p.id);
    }
    return s;
  }, [people, todayStr]);

  const totalAbsences = useMemo(
    () => people.reduce((s, p) => s + p.absences.length, 0),
    [people],
  );
  const activeCount = useMemo(
    () =>
      people.filter((p) =>
        p.absences.some((a) => a.dateDebut <= todayStr && a.dateFin >= todayStr),
      ).length,
    [people, todayStr],
  );

  const teamCounts = useMemo(() => {
    const counts = Object.fromEntries(TEAMS.map((t) => [t, 0])) as Record<Team, number>;
    for (const p of people) counts[p.team] += 1;
    return counts;
  }, [people]);

  const activeTeamPeople = useMemo(
    () => people.filter((p) => p.team === activeTeam),
    [people, activeTeam],
  );

  useEffect(() => {
    if (!loaded) return;
    for (const e of expiring) {
      const key = `notified-reprise-${e.absence.id}-${e.days}`;
      if (!sessionStorage.getItem(key)) {
        toast.warning(`Reprise de service : ${e.person.nom}`, {
          description: `${e.absence.motif} · reprise ${
            e.days === 0 ? "aujourd'hui" : `dans ${e.days} jour(s)`
          } (${fmt(e.reprise)})`,
          duration: e.days === 0 ? 10000 : 5000,
        });
        sessionStorage.setItem(key, "1");
      }
    }
  }, [expiring, loaded]);


  const addPerson = (p: Omit<Person, "id" | "absences">) => {
    setPeople((prev) => [...prev, { ...p, id: makeId(), absences: [] }]);
    toast.success("Personnel ajouté");
  };
  const deletePerson = (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    toast.success("Personnel supprimé");
  };
  const addAbsence = (personId: string, a: Omit<Absence, "id">) => {
    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId
          ? { ...p, absences: [...p.absences, { ...a, id: makeId() }] }
          : p,
      ),
    );
    toast.success("Absence enregistrée");
  };
  const deleteAbsence = (personId: string, absenceId: string) => {
    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId
          ? { ...p, absences: p.absences.filter((x) => x.id !== absenceId) }
          : p,
      ),
    );
  };

  const handleExport = async () => {
    if (totalAbsences === 0) {
      toast.error("Aucune absence à exporter");
      return;
    }
    try {
      await exportExcel(people);
      toast.success("Fichier Excel téléchargé");
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    try {
      const payload = {
        app: "gestion-conges",
        version: 1,
        exportedAt: new Date().toISOString(),
        peopleCount: people.length,
        absenceCount: totalAbsences,
        people,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sauvegarde-conges-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Sauvegarde téléchargée", {
        description: `${people.length} personne(s) · ${totalAbsences} absence(s)`,
      });
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleRestoreFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as {
        app?: string;
        people?: Person[];
      };
      if (!data || !Array.isArray(data.people)) {
        toast.error("Fichier invalide", {
          description: "Format non reconnu",
        });
        return;
      }
      // Basic shape validation
      const restored = data.people
        .filter((p) => p && typeof p.nom === "string" && Array.isArray(p.absences))
        .map((p) => ({
          ...p,
          id: p.id ?? makeId(),
          absences: p.absences.map((a) => ({
            ...a,
            id: a.id ?? makeId(),
          })),
        }));
      const ok = window.confirm(
        `Restaurer ${restored.length} personne(s) ?\n\nCela remplacera toutes vos données actuelles (${people.length} personne(s)).`,
      );
      if (!ok) return;
      setPeople(restored);
      toast.success("Données restaurées", {
        description: `${restored.length} personne(s) importée(s)`,
      });
    } catch {
      toast.error("Fichier illisible", {
        description: "Vérifiez que c'est bien un fichier de sauvegarde JSON",
      });
    }
  };


  return (
    <div className="min-h-screen bg-background pb-24">
      <Toaster richColors position="top-center" />

      {/* Header with gradient */}
      <header
        className="relative overflow-hidden text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        {/* Decorative blur circles removed for Android WebView performance */}
        <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-white/20  flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl sm:text-2xl font-bold tracking-tight">
                  Gestion des Congés
                </h1>
                <p className="text-xs sm:text-sm text-white/80 truncate">
                  Personnel · Absences · Notifications
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAboutOpen(true)}
                aria-label="À propos"
                className="shrink-0 rounded-full w-10 h-10 bg-white/15  border-white/30 text-white hover:bg-white/25 hover:text-white"
              >
                <Info className="w-4 h-4" />
              </Button>
              <NotificationsPopover expiring={expiring} />
            </div>
          </div>

          {/* Stat cards */}
          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            <StatCard label="Personnel" value={people.length} icon={<Users className="w-4 h-4" />} />
            <StatCard label="Absents" value={activeCount} icon={<CalendarIcon className="w-4 h-4" />} />
            <StatCard label="Total abs." value={totalAbsences} icon={<Bell className="w-4 h-4" />} />
          </div>

          {/* Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              size="lg"
              onClick={() => setAddPersonOpen(true)}
              className="w-full bg-white text-primary hover:bg-white/90 shadow-lg font-semibold"
            >
              <UserPlus className="w-4 h-4" /> Ajouter
            </Button>
            <div className="relative">
              <Button
                size="lg"
                variant="outline"
                onClick={() => setDataMenuOpen((v) => !v)}
                className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white font-semibold"
              >
                <Download className="w-4 h-4" /> Données
              </Button>
              {dataMenuOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Exporter</div>
                  <button
                    type="button"
                    onClick={() => {
                      setDataMenuOpen(false);
                      void handleExport();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Fichier Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDataMenuOpen(false);
                      handleBackup();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
                  >
                    <Save className="w-4 h-4" />
                    <span>Sauvegarde complète</span>
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Importer</div>
                  <button
                    type="button"
                    onClick={() => {
                      setDataMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Restaurer une sauvegarde</span>
                  </button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleRestoreFile(file);
                e.target.value = "";
              }}
            />

          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 sm:px-4 -mt-4 space-y-4">
        {/* Search bar */}
        <div className="relative rounded-2xl bg-card shadow-sm border">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un nom, grade, PPR ou CIN…"
            className="pl-10 pr-10 h-12 rounded-2xl border-0 shadow-none focus-visible:ring-0 bg-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted text-muted-foreground"
              aria-label="Effacer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {normalizedSearch ? (
          <SearchResults
            people={people}
            query={normalizedSearch}
            onDelete={deletePerson}
            onOpenAbsence={setAbsencePerson}
            onDeleteAbsence={deleteAbsence}
            onOpenHistory={setHistoryPerson}
            repriseTodayIds={repriseTodayIds}
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card shadow-sm border p-1.5 overflow-x-auto">
              <div className="grid min-w-[380px] grid-cols-4 gap-1" role="tablist" aria-label="Équipes">
                {TEAMS.map((t) => {
                  const active = activeTeam === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveTeam(t)}
                      className={`rounded-xl px-1 py-2 text-center ${
                        active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
                      }`}
                      role="tab"
                      aria-selected={active}
                    >
                      <span className="block text-[11px] font-semibold">{TEAM_SHORT[t]}</span>
                      <span className="block text-[10px] opacity-70">{teamCounts[t]} pers.</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <TeamList
              people={activeTeamPeople}
              onDelete={deletePerson}
              onOpenAbsence={setAbsencePerson}
              onDeleteAbsence={deleteAbsence}
              onOpenHistory={setHistoryPerson}
              repriseTodayIds={repriseTodayIds}
            />
          </div>
        )}
      </main>

      <SimpleModal open={addPersonOpen} onOpenChange={setAddPersonOpen} className="max-w-md">
        <AddPersonDialog
          defaultTeam={activeTeam}
          onSubmit={(p) => {
            addPerson(p);
            setAddPersonOpen(false);
          }}
        />
      </SimpleModal>

      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />

      <HistoryDialog
        person={historyPerson ? people.find((p) => p.id === historyPerson.id) ?? null : null}
        onOpenChange={(v) => !v && setHistoryPerson(null)}
      />

      <SimpleModal open={!!absencePerson} onOpenChange={(v) => !v && setAbsencePerson(null)} className="max-w-md">
        {absencePerson && (
          <AddAbsenceDialog
            person={absencePerson}
            onSubmit={(a) => {
              addAbsence(absencePerson.id, a);
              setAbsencePerson(null);
            }}
          />
        )}
      </SimpleModal>
    </div>
  );
}

function SimpleModal({
  open,
  onOpenChange,
  children,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-4"
      role="presentation"
      onMouseDown={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[90vh] w-full overflow-auto rounded-2xl border bg-background p-5 shadow-lg ${className}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/15  border border-white/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-white/80 text-[11px] font-medium">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
    </div>
  );
}

function NotificationsPopover({
  expiring,
}: {
  expiring: { person: Person; absence: Absence; days: number }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative shrink-0 rounded-full w-10 h-10 bg-white/15  border-white/30 text-white hover:bg-white/25 hover:text-white"
      >
        <Bell className="w-4 h-4" />
        {expiring.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-white">
            {expiring.length}
          </span>
        )}
      </Button>
      <SimpleModal open={open} onOpenChange={setOpen} className="max-w-sm">
        <h2 className="pr-8 text-lg font-semibold">Expirations proches</h2>
        {expiring.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune expiration dans les 3 prochains jours.
          </p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-auto">
            {expiring.map((e) => (
              <li
                key={e.absence.id}
                className="border rounded-xl p-3 bg-muted/40"
              >
                <div className="font-semibold text-sm">{e.person.nom}</div>
                <div className="text-xs text-muted-foreground">
                  {e.person.team}
                </div>
                <div className="text-sm mt-1">
                  {e.absence.motif} · fin le {fmt(e.absence.dateFin)}
                </div>
                <Badge
                  variant={e.days === 0 ? "destructive" : "secondary"}
                  className="mt-1"
                >
                  {e.days === 0 ? "Aujourd'hui" : `Dans ${e.days} jour(s)`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </SimpleModal>
    </>
  );
}

const MOTIF_COLORS: Record<Motif, string> = {
  "Congé administratif": "bg-blue-100 text-blue-700 border-blue-200",
  "Congé maladie": "bg-red-100 text-red-700 border-red-200",
  "Congé de naissance": "bg-pink-100 text-pink-700 border-pink-200",
  Permission: "bg-amber-100 text-amber-700 border-amber-200",
  Récupération: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Mission: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Formation: "bg-purple-100 text-purple-700 border-purple-200",
  Autre: "bg-slate-100 text-slate-700 border-slate-200",
};

function TeamList({
  people,
  onDelete,
  onOpenAbsence,
  onDeleteAbsence,
  onOpenHistory,
  repriseTodayIds,
}: {
  people: Person[];
  onDelete: (id: string) => void;
  onOpenAbsence: (p: Person) => void;
  onDeleteAbsence: (personId: string, absenceId: string) => void;
  onOpenHistory: (p: Person) => void;
  repriseTodayIds: Set<string>;
}) {
  if (people.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center bg-card">
        <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Aucun personnel dans cette équipe.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Utilisez le bouton « Ajouter » ci-dessus.
        </p>
      </div>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((p) => {
        const active = p.absences.find(
          (a) => a.dateDebut <= today && a.dateFin >= today,
        );
        const repriseToday = repriseTodayIds.has(p.id);
        const recentAbsences = [...p.absences]
          .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut))
          .slice(0, 3);
        return (
          <div
            key={p.id}
            className={`group rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all overflow-hidden ${
              repriseToday ? "border-destructive ring-2 ring-destructive/40" : ""
            }`}
          >
            <button
              onClick={() => onOpenAbsence(p)}
              className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors"
            >
              <div
                className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow ${
                  repriseToday ? "pulse-ring" : ""
                }`}
                style={{ background: "var(--gradient-primary)" }}
              >
                {initials(p.nom) || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`font-semibold truncate ${repriseToday ? "blink-red" : ""}`}>
                  {p.nom}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.grade || "—"}
                </div>
                <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5 truncate">
                  PPR {p.ppr || "—"} · CIN {p.cin || "—"}
                </div>
                {repriseToday && (
                  <div className="text-[11px] font-bold text-destructive mt-1 uppercase tracking-wide">
                    ● Reprise de service aujourd'hui
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>


            {active && (
              <div className="px-4 pb-2">
                <div
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${MOTIF_COLORS[active.motif]}`}
                >
                  En {active.motif} jusqu'au {fmt(active.dateFin)}
                </div>
              </div>
            )}

            {p.absences.length > 0 && (
              <div className="px-4 pb-3 border-t pt-3">
                <button
                  onClick={() => onOpenHistory(p)}
                  className="w-full flex items-center justify-between mb-1.5 group/hist"
                  aria-label="Voir historique annuel"
                >
                  <span className="text-[11px] font-semibold text-primary uppercase tracking-wide group-hover/hist:underline">
                    Historique ({p.absences.length}) · voir l'année
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-primary" />
                </button>
                <ul className="space-y-1.5">
                  {recentAbsences.map((a) => (
                      <li
                        key={a.id}
                        className="text-xs flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <span
                            className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${MOTIF_COLORS[a.motif]} mb-0.5`}
                          >
                            {a.motif}
                          </span>
                          <div className="text-muted-foreground truncate">
                            {fmt(a.dateDebut)} → {fmt(a.dateFin)}
                          </div>
                          <div className="text-[10px] text-muted-foreground/80 truncate">
                            Reprise : {fmt(repriseOf(a))}
                          </div>

                        </div>
                        <button
                          onClick={() => onDeleteAbsence(p.id, a.id)}
                          className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                          aria-label="Supprimer absence"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="px-4 pb-4 grid grid-cols-[1fr_auto] gap-2">
              <Button
                size="sm"
                onClick={() => onOpenAbsence(p)}
                className="rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" /> Absence
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onDelete(p.id)}
                aria-label="Supprimer personnel"
                className="rounded-xl text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddPersonDialog({
  defaultTeam,
  onSubmit,
}: {
  defaultTeam: Team;
  onSubmit: (p: Omit<Person, "id" | "absences">) => void;
}) {
  const [nom, setNom] = useState("");
  const [grade, setGrade] = useState("");
  const [ppr, setPpr] = useState("");
  const [cin, setCin] = useState("");
  const [team, setTeam] = useState<Team>(defaultTeam);

  return (
    <>
      <h2 className="pr-8 text-lg font-semibold">Ajouter un personnel</h2>
      <div className="space-y-3">
        <div>
          <Label>Nom complet</Label>
          <Input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={100} className="rounded-xl" />
        </div>
        <div>
          <Label>Grade</Label>
          <Input value={grade} onChange={(e) => setGrade(e.target.value)} maxLength={60} className="rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>PPR</Label>
            <Input value={ppr} onChange={(e) => setPpr(e.target.value)} maxLength={20} className="rounded-xl" />
          </div>
          <div>
            <Label>CIN</Label>
            <Input value={cin} onChange={(e) => setCin(e.target.value)} maxLength={20} className="rounded-xl" />
          </div>
        </div>
        <div>
          <Label>Équipe / Service</Label>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value as Team)}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <Button
          className="w-full rounded-xl"
          size="lg"
          onClick={() => {
            if (!nom.trim()) return toast.error("Le nom est requis");
            onSubmit({ nom: nom.trim(), grade: grade.trim(), ppr: ppr.trim(), cin: cin.trim(), team });
          }}
        >
          Enregistrer
        </Button>
      </div>
    </>
  );
}

function AddAbsenceDialog({
  person,
  onSubmit,
}: {
  person: Person;
  onSubmit: (a: Omit<Absence, "id">) => void;
}) {
  const [motif, setMotif] = useState<Motif>("Congé administratif");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [dateReprise, setDateReprise] = useState("");
  const [repriseTouched, setRepriseTouched] = useState(false);
  const [note, setNote] = useState("");

  // Auto-suggest reprise = dateFin + 1 unless user changed it
  const handleFinChange = (v: string) => {
    setDateFin(v);
    if (v && !repriseTouched) {
      setDateReprise(addDaysISO(v, 1));
    }
  };

  return (
    <>
      <div className="pr-8">
        <h2 className="text-lg font-semibold">Nouvelle absence</h2>
        <p className="text-sm text-muted-foreground">{person.nom} · {person.team}</p>
      </div>
      <div className="space-y-3">
        <div>
          <Label>Motif</Label>
          <select
            value={motif}
            onChange={(e) => setMotif(e.target.value as Motif)}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            {MOTIFS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date début</Label>
            <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <Label>Date fin</Label>
            <Input type="date" value={dateFin} onChange={(e) => handleFinChange(e.target.value)} className="rounded-xl" />
          </div>
        </div>
        <div>
          <Label>Date de reprise de service</Label>
          <Input
            type="date"
            value={dateReprise}
            onChange={(e) => { setDateReprise(e.target.value); setRepriseTouched(true); }}
            className="rounded-xl"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Vous serez alerté(e) ce jour-là (nom clignotant en rouge).
          </p>
        </div>
        <div>
          <Label>Note (optionnel)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="rounded-xl" />
        </div>
      </div>
      <div className="mt-4">
        <Button
          size="lg"
          className="w-full rounded-xl"
          onClick={() => {
            if (!dateDebut || !dateFin) return toast.error("Dates requises");
            if (dateFin < dateDebut) return toast.error("La date de fin doit être après la date de début");
            if (dateReprise && dateReprise < dateFin) return toast.error("La reprise doit être après la date de fin");
            onSubmit({
              motif,
              dateDebut,
              dateFin,
              dateReprise: dateReprise || addDaysISO(dateFin, 1),
              note: note.trim() || undefined,
            });
          }}
        >
          Enregistrer
        </Button>
      </div>
    </>
  );
}



function SearchResults({
  people,
  query,
  onDelete,
  onOpenAbsence,
  onDeleteAbsence,
  onOpenHistory,
  repriseTodayIds,
}: {
  people: Person[];
  query: string;
  onDelete: (id: string) => void;
  onOpenAbsence: (p: Person) => void;
  onDeleteAbsence: (personId: string, absenceId: string) => void;
  onOpenHistory: (p: Person) => void;
  repriseTodayIds: Set<string>;
}) {
  const matches = useMemo(() => {
    const q = query.toLowerCase();
    return people.filter(
      (p) =>
        p.nom.toLowerCase().includes(q) ||
        p.grade.toLowerCase().includes(q) ||
        p.ppr.toLowerCase().includes(q) ||
        p.cin.toLowerCase().includes(q),
    );
  }, [people, query]);
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground px-1">
        {matches.length} résultat(s) pour « {query} »
      </div>
      <TeamList
        people={matches}
        onDelete={onDelete}
        onOpenAbsence={onOpenAbsence}
        onDeleteAbsence={onDeleteAbsence}
        onOpenHistory={onOpenHistory}
        repriseTodayIds={repriseTodayIds}
      />
    </div>
  );
}

function HistoryDialog({
  person,
  onOpenChange,
}: {
  person: Person | null;
  onOpenChange: (v: boolean) => void;
}) {
  const year = new Date().getFullYear();
  const yearAbs = useMemo(() => {
    if (!person) return [];
    return person.absences
      .filter((a) => {
        const y1 = new Date(a.dateDebut).getFullYear();
        const y2 = new Date(a.dateFin).getFullYear();
        return y1 === year || y2 === year;
      })
      .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut));
  }, [person, year]);

  // Compute days per motif, counting only days that fall inside the current year
  const totals = useMemo(() => {
    const map = new Map<Motif, number>();
    if (!person) return map;
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    for (const a of person.absences) {
      const start = new Date(a.dateDebut);
      const end = new Date(a.dateFin);
      const s = start < yearStart ? yearStart : start;
      const e = end > yearEnd ? yearEnd : end;
      if (s > e) continue;
      const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
      map.set(a.motif, (map.get(a.motif) ?? 0) + days);
    }
    return map;
  }, [person, year]);

  const totalDays = Array.from(totals.values()).reduce((s, n) => s + n, 0);

  return (
    <SimpleModal open={!!person} onOpenChange={onOpenChange} className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="pr-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Historique {year}
          </h2>
          {person && (
            <p className="text-sm text-muted-foreground">
              {person.nom} · {person.grade || "—"} · {person.team}
            </p>
          )}
        </div>

        <div className="overflow-auto space-y-4 pr-1">
          {/* Totals per motif */}
          <div>
            <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
              Total par motif ({totalDays} jour{totalDays > 1 ? "s" : ""})
            </div>
            {totals.size === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center rounded-xl bg-muted/40">
                Aucune absence enregistrée en {year}.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Array.from(totals.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([motif, days]) => (
                    <div
                      key={motif}
                      className={`rounded-xl border px-3 py-2 ${MOTIF_COLORS[motif]}`}
                    >
                      <div className="text-[11px] font-semibold truncate">{motif}</div>
                      <div className="text-lg font-bold leading-tight">
                        {days} <span className="text-xs font-normal">j</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Detailed list */}
          {yearAbs.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
                Détail ({yearAbs.length})
              </div>
              <ul className="space-y-2">
                {yearAbs.map((a) => {
                  const dur =
                    Math.round(
                      (new Date(a.dateFin).getTime() -
                        new Date(a.dateDebut).getTime()) /
                        86400000,
                    ) + 1;
                  return (
                    <li
                      key={a.id}
                      className="rounded-xl border p-3 bg-card space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded border font-medium ${MOTIF_COLORS[a.motif]}`}
                        >
                          {a.motif}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {dur} j
                        </span>
                      </div>
                      <div className="text-sm">
                        {fmt(a.dateDebut)} → {fmt(a.dateFin)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Reprise : {fmt(repriseOf(a))}
                      </div>
                      {a.note && (
                        <div className="text-xs text-muted-foreground italic">
                          « {a.note} »
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
    </SimpleModal>
  );
}


function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <SimpleModal open={open} onOpenChange={onOpenChange} className="max-w-md">
        <div className="pr-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="w-5 h-5 text-primary" /> À propos
          </h2>
        </div>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground leading-relaxed">
            Application de gestion des congés administratifs, congés maladie,
            permissions et récupérations du personnel. Organisez vos équipes
            (Équipe A, Équipe B, Standardistes, Service administratif),
            enregistrez les absences, recevez des notifications à l'approche
            des expirations et exportez toutes les données au format CSV/Excel.
          </p>
          <div className="rounded-2xl border p-4 bg-muted/40 space-y-2">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
              Développeur
            </div>
            <div className="font-semibold text-base">Ayoub Sadkouni</div>
            <a
              href="mailto:sadkouni1@gmail.com"
              className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
            >
              <Mail className="w-4 h-4" /> sadkouni1@gmail.com
            </a>
          </div>
          <div className="text-[11px] text-muted-foreground text-center">
            Données stockées localement sur votre appareil.
          </div>
        </div>
    </SimpleModal>
  );
}
