import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Bell, Plus, Trash2, Calendar as CalendarIcon, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Team = "Equipe A" | "Equipe B" | "Standardistes" | "Service Administratif";
const TEAMS: Team[] = ["Equipe A", "Equipe B", "Standardistes", "Service Administratif"];

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

function Index() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTeam, setActiveTeam] = useState<Team>("Equipe A");
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [absencePerson, setAbsencePerson] = useState<Person | null>(null);

  useEffect(() => {
    setPeople(loadPeople());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
  }, [people, loaded]);

  // Notifications for expiring absences
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

  useEffect(() => {
    if (!loaded) return;
    for (const e of expiring) {
      const key = `notified-${e.absence.id}-${e.days}`;
      if (!sessionStorage.getItem(key)) {
        toast.warning(`Expiration proche : ${e.person.nom}`, {
          description: `${e.absence.motif} se termine ${e.days === 0 ? "aujourd'hui" : `dans ${e.days} jour(s)`} (${fmt(e.absence.dateFin)})`,
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
        p.id === personId ? { ...p, absences: [...p.absences, { ...a, id: crypto.randomUUID() }] } : p,
      ),
    );
    toast.success("Absence enregistrée");
  };

  const deleteAbsence = (personId: string, absenceId: string) => {
    setPeople((prev) =>
      prev.map((p) =>
        p.id === personId ? { ...p, absences: p.absences.filter((x) => x.id !== absenceId) } : p,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gestion des Congés</h1>
              <p className="text-sm text-muted-foreground">Personnel · Congés · Permissions · Récupérations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsPopover expiring={expiring} />
            <Dialog open={addPersonOpen} onOpenChange={setAddPersonOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-1" /> Ajouter un personnel</Button>
              </DialogTrigger>
              <AddPersonDialog
                defaultTeam={activeTeam}
                onSubmit={(p) => {
                  addPerson(p);
                  setAddPersonOpen(false);
                }}
              />
            </Dialog>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs value={activeTeam} onValueChange={(v) => setActiveTeam(v as Team)}>
          <TabsList className="flex-wrap h-auto">
            {TEAMS.map((t) => {
              const count = people.filter((p) => p.team === t).length;
              return (
                <TabsTrigger key={t} value={t} className="gap-2">
                  {t} <Badge variant="secondary">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TEAMS.map((t) => (
            <TabsContent key={t} value={t} className="mt-4">
              <TeamGrid
                people={people.filter((p) => p.team === t)}
                onDelete={deletePerson}
                onOpenAbsence={setAbsencePerson}
                onDeleteAbsence={deleteAbsence}
              />
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <Dialog open={!!absencePerson} onOpenChange={(v) => !v && setAbsencePerson(null)}>
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

function NotificationsPopover({ expiring }: { expiring: { person: Person; absence: Absence; days: number }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Bell className="w-4 h-4" />
          {expiring.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {expiring.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notifications — Expirations proches</DialogTitle>
        </DialogHeader>
        {expiring.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune expiration dans les 3 prochains jours.</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-auto">
            {expiring.map((e) => (
              <li key={e.absence.id} className="border rounded-md p-3">
                <div className="font-medium">{e.person.nom} <span className="text-muted-foreground text-sm">— {e.person.team}</span></div>
                <div className="text-sm">{e.absence.motif} · fin le {fmt(e.absence.dateFin)}</div>
                <div className="text-xs text-muted-foreground">{e.days === 0 ? "Se termine aujourd'hui" : `Dans ${e.days} jour(s)`}</div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TeamGrid({
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
      <div className="border border-dashed rounded-lg p-10 text-center text-muted-foreground">
        Aucun personnel dans cette équipe. Cliquez sur « Ajouter un personnel ».
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {people.map((p) => {
        const active = p.absences.find((a) => {
          const today = new Date().toISOString().slice(0, 10);
          return a.dateDebut <= today && a.dateFin >= today;
        });
        return (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <button className="text-left" onClick={() => onOpenAbsence(p)}>
                  <CardTitle className="text-lg hover:underline">{p.nom}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{p.grade}</p>
                </button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(p.id)} aria-label="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground">
                PPR : <span className="text-foreground font-mono">{p.ppr}</span> · CIN : <span className="text-foreground font-mono">{p.cin}</span>
              </div>
              {active && (
                <Badge variant="destructive" className="w-full justify-center py-1">
                  En {active.motif} jusqu'au {fmt(active.dateFin)}
                </Badge>
              )}
              {p.absences.length > 0 && (
                <div className="border-t pt-2 space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Historique ({p.absences.length})</div>
                  <ul className="space-y-1 max-h-40 overflow-auto">
                    {[...p.absences].sort((a, b) => b.dateDebut.localeCompare(a.dateDebut)).map((a) => (
                      <li key={a.id} className="text-xs flex items-start justify-between gap-2 bg-muted/40 rounded px-2 py-1">
                        <div>
                          <div className="font-medium">{a.motif}</div>
                          <div className="text-muted-foreground">{fmt(a.dateDebut)} → {fmt(a.dateFin)}</div>
                          {a.note && <div className="italic text-muted-foreground">{a.note}</div>}
                        </div>
                        <button onClick={() => onDeleteAbsence(p.id, a.id)} className="text-muted-foreground hover:text-destructive" aria-label="Supprimer absence">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => onOpenAbsence(p)}>
                <CalendarIcon className="w-4 h-4 mr-1" /> Ajouter une absence
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AddPersonDialog({ defaultTeam, onSubmit }: { defaultTeam: Team; onSubmit: (p: Omit<Person, "id" | "absences">) => void }) {
  const [nom, setNom] = useState("");
  const [grade, setGrade] = useState("");
  const [ppr, setPpr] = useState("");
  const [cin, setCin] = useState("");
  const [team, setTeam] = useState<Team>(defaultTeam);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Ajouter un personnel</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Nom complet</Label>
          <Input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={100} />
        </div>
        <div>
          <Label>Grade</Label>
          <Input value={grade} onChange={(e) => setGrade(e.target.value)} maxLength={60} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>PPR</Label>
            <Input value={ppr} onChange={(e) => setPpr(e.target.value)} maxLength={20} />
          </div>
          <div>
            <Label>CIN</Label>
            <Input value={cin} onChange={(e) => setCin(e.target.value)} maxLength={20} />
          </div>
        </div>
        <div>
          <Label>Équipe / Service</Label>
          <Select value={team} onValueChange={(v) => setTeam(v as Team)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
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

function AddAbsenceDialog({ person, onSubmit }: { person: Person; onSubmit: (a: Omit<Absence, "id">) => void }) {
  const [motif, setMotif] = useState<Motif>("Congé administratif");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [note, setNote] = useState("");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Motif d'indisponibilité — {person.nom}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Motif</Label>
          <Select value={motif} onValueChange={(v) => setMotif(v as Motif)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOTIFS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date de début</Label>
            <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div>
            <Label>Date de fin</Label>
            <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Note (optionnel)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </div>
      </div>
      <DialogFooter>
        <Button
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
