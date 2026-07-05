import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function csvEscape(v: string) {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCSV(people: Person[]) {
  const rows: string[] = [];
  rows.push(
    [
      "Nom",
      "Grade",
      "PPR",
      "CIN",
      "Equipe",
      "Motif",
      "Date debut",
      "Date fin",
      "Duree (jours)",
      "Note",
    ].join(";"),
  );
  for (const p of people) {
    if (p.absences.length === 0) continue;
    for (const a of p.absences) {
      const dur =
        Math.max(0, daysUntil(a.dateFin) - daysUntil(a.dateDebut)) + 1;
      rows.push(
        [
          p.nom,
          p.grade,
          p.ppr,
          p.cin,
          p.team,
          a.motif,
          a.dateDebut,
          a.dateFin,
          String(dur),
          a.note ?? "",
        ]
          .map(csvEscape)
          .join(";"),
      );
    }
  }
  // BOM for Excel UTF-8
  const blob = new Blob(["\uFEFF" + rows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `conges_${new Date().toISOString().slice(0, 10)}.csv`;
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
  const [search, setSearch] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    setPeople(loadPeople());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
  }, [people, loaded]);

  const expiring = useMemo(() => {
    const items: { person: Person; absence: Absence; days: number }[] = [];
    for (const p of people) {
      for (const a of p.absences) {
        const d = daysUntil(a.dateFin);
        if (d >= 0 && d <= 3) items.push({ person: p, absence: a, days: d });
      }
    }
    return items.sort((a, b) => a.days - b.days);
  }, [people]);

  const totalAbsences = useMemo(
    () => people.reduce((s, p) => s + p.absences.length, 0),
    [people],
  );
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeCount = useMemo(
    () =>
      people.filter((p) =>
        p.absences.some((a) => a.dateDebut <= todayStr && a.dateFin >= todayStr),
      ).length,
    [people, todayStr],
  );

  useEffect(() => {
    if (!loaded) return;
    for (const e of expiring) {
      const key = `notified-${e.absence.id}-${e.days}`;
      if (!sessionStorage.getItem(key)) {
        toast.warning(`Expiration proche : ${e.person.nom}`, {
          description: `${e.absence.motif} se termine ${
            e.days === 0 ? "aujourd'hui" : `dans ${e.days} jour(s)`
          } (${fmt(e.absence.dateFin)})`,
        });
        sessionStorage.setItem(key, "1");
      }
    }
  }, [expiring, loaded]);

  const addPerson = (p: Omit<Person, "id" | "absences">) => {
    setPeople((prev) => [...prev, { ...p, id: crypto.randomUUID(), absences: [] }]);
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
          ? { ...p, absences: [...p.absences, { ...a, id: crypto.randomUUID() }] }
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

  const handleExport = () => {
    if (totalAbsences === 0) {
      toast.error("Aucune absence à exporter");
      return;
    }
    exportCSV(people);
    toast.success("Export CSV téléchargé");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Toaster richColors position="top-center" />

      {/* Header with gradient */}
      <header
        className="relative overflow-hidden text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
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
            <NotificationsPopover expiring={expiring} />
          </div>

          {/* Stat cards */}
          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            <StatCard label="Personnel" value={people.length} icon={<Users className="w-4 h-4" />} />
            <StatCard label="Absents" value={activeCount} icon={<CalendarIcon className="w-4 h-4" />} />
            <StatCard label="Total abs." value={totalAbsences} icon={<Bell className="w-4 h-4" />} />
          </div>

          {/* Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Dialog open={addPersonOpen} onOpenChange={setAddPersonOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="w-full bg-white text-primary hover:bg-white/90 shadow-lg font-semibold"
                >
                  <UserPlus className="w-4 h-4" /> Ajouter
                </Button>
              </DialogTrigger>
              <AddPersonDialog
                defaultTeam={activeTeam}
                onSubmit={(p) => {
                  addPerson(p);
                  setAddPersonOpen(false);
                }}
              />
            </Dialog>
            <Button
              size="lg"
              variant="outline"
              onClick={handleExport}
              className="w-full bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white backdrop-blur font-semibold"
            >
              <Download className="w-4 h-4" /> Exporter
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 sm:px-4 -mt-4">
        <Tabs value={activeTeam} onValueChange={(v) => setActiveTeam(v as Team)}>
          <div className="rounded-2xl bg-card shadow-sm border p-1.5 overflow-x-auto">
            <TabsList className="bg-transparent h-auto gap-1 w-full grid grid-cols-4 min-w-[380px]">
              {TEAMS.map((t) => {
                const count = people.filter((p) => p.team === t).length;
                return (
                  <TabsTrigger
                    key={t}
                    value={t}
                    className="flex-col gap-0.5 py-2 px-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
                  >
                    <span className="text-[11px] font-semibold">{TEAM_SHORT[t]}</span>
                    <span className="text-[10px] opacity-70">{count} pers.</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {TEAMS.map((t) => (
            <TabsContent key={t} value={t} className="mt-4">
              <TeamList
                people={people.filter((p) => p.team === t)}
                onDelete={deletePerson}
                onOpenAbsence={setAbsencePerson}
                onDeleteAbsence={deleteAbsence}
              />
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <Dialog
        open={!!absencePerson}
        onOpenChange={(v) => !v && setAbsencePerson(null)}
      >
        {absencePerson && (
          <AddAbsenceDialog
            person={absencePerson}
            onSubmit={(a) => {
              addAbsence(absencePerson.id, a);
              setAbsencePerson(null);
            }}
          />
        )}
      </Dialog>
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
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 px-3 py-2.5">
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative shrink-0 rounded-full w-10 h-10 bg-white/15 backdrop-blur border-white/30 text-white hover:bg-white/25 hover:text-white"
        >
          <Bell className="w-4 h-4" />
          {expiring.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-white">
              {expiring.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Expirations proches</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
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
}: {
  people: Person[];
  onDelete: (id: string) => void;
  onOpenAbsence: (p: Person) => void;
  onDeleteAbsence: (personId: string, absenceId: string) => void;
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
        return (
          <div
            key={p.id}
            className="group rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all overflow-hidden"
          >
            <button
              onClick={() => onOpenAbsence(p)}
              className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors"
            >
              <div
                className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow"
                style={{ background: "var(--gradient-primary)" }}
              >
                {initials(p.nom) || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{p.nom}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.grade || "—"}
                </div>
                <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5 truncate">
                  PPR {p.ppr || "—"} · CIN {p.cin || "—"}
                </div>
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
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Historique ({p.absences.length})
                </div>
                <ul className="space-y-1.5 max-h-40 overflow-auto">
                  {[...p.absences]
                    .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut))
                    .map((a) => (
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
    <DialogContent className="max-w-md rounded-2xl">
      <DialogHeader>
        <DialogTitle>Ajouter un personnel</DialogTitle>
      </DialogHeader>
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
          <Select value={team} onValueChange={(v) => setTeam(v as Team)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
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
      </DialogFooter>
    </DialogContent>
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
  const [note, setNote] = useState("");

  return (
    <DialogContent className="max-w-md rounded-2xl">
      <DialogHeader>
        <DialogTitle>Nouvelle absence</DialogTitle>
        <p className="text-sm text-muted-foreground">{person.nom} · {person.team}</p>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Motif</Label>
          <Select value={motif} onValueChange={(v) => setMotif(v as Motif)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOTIFS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date début</Label>
            <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <Label>Date fin</Label>
            <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="rounded-xl" />
          </div>
        </div>
        <div>
          <Label>Note (optionnel)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="rounded-xl" />
        </div>
      </div>
      <DialogFooter>
        <Button
          size="lg"
          className="w-full rounded-xl"
          onClick={() => {
            if (!dateDebut || !dateFin) return toast.error("Dates requises");
            if (dateFin < dateDebut) return toast.error("La date de fin doit être après la date de début");
            onSubmit({ motif, dateDebut, dateFin, note: note.trim() || undefined });
          }}
        >
          Enregistrer
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
