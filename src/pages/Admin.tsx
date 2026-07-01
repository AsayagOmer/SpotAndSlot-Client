import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Shield, ArrowLeft, Users as UsersIcon, Activity, Car, LayoutGrid, MapPin,
  RefreshCw, AlertTriangle, CheckCircle2, Stethoscope, Loader2, Database,
  Plus, Trash2, Pencil, Accessibility, LogOut, UserPlus, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAllObjects, useAdminUsers, useAdminCommands } from "@/hooks/useParkingData";
import {
  ObjectType, apiConfig, runHealthCheck, createObject, updateObject, deleteObject,
  createUserAsAdmin,
  type ObjectBoundary, type SlotDetails, type FaultySlot,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const det = (o: ObjectBoundary) => (o.objectDetails ?? {}) as SlotDetails;

const roleStyle = (role: string) =>
  role === "ADMIN"
    ? "bg-primary/15 text-primary border-primary/30"
    : role === "OPERATOR"
    ? "bg-blue-500/15 text-blue-600 border-blue-500/30"
    : "bg-muted text-muted-foreground border-border";

const StatCard = ({
  icon: Icon, label, value, sub, tone = "default",
}: {
  icon: React.ElementType; label: string; value: React.ReactNode; sub?: string;
  tone?: "default" | "primary" | "danger" | "ok";
}) => {
  const toneCls = {
    default: "text-foreground", primary: "text-primary",
    danger: "text-destructive", ok: "text-emerald-600",
  }[tone];
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${toneCls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-bold tabular-nums leading-none ${toneCls}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1 truncate">{label}{sub ? ` · ${sub}` : ""}</div>
      </div>
    </Card>
  );
};

const Metric = ({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "ok" | "danger" }) => {
  const c = tone === "ok" ? "text-emerald-600" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center">
      <div className={`text-xl font-bold tabular-nums ${c}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
};

// Small reusable rename dialog
const RenameDialog = ({
  title, current, onSave, children,
}: {
  title: string; current: string; onSave: (name: string) => Promise<void>; children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setName(current); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <DialogFooter>
          <Button
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try { await onSave(name.trim()); setOpen(false); }
              finally { setBusy(false); }
            }}
          >
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Confirm-and-delete button (lot / section / slot)
const DeleteButton = ({
  what, onDelete, size = "sm",
}: { what: string; onDelete: () => Promise<void>; size?: "sm" | "icon-xs" }) => {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {size === "sm" ? (
          <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10">
            <Trash2 className="w-4 h-4 mr-1.5" /> Delete
          </Button>
        ) : (
          <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {what}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {what} (children are removed too). This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              try { await onDelete(); } finally { setBusy(false); }
            }}
          >
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const Admin = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const objectsQ = useAllObjects();
  const usersQ = useAdminUsers();
  const commandsQ = useAdminCommands();

  const objects = objectsQ.data ?? [];
  const users = usersQ.data ?? [];
  const commands = commandsQ.data ?? [];
  const myEmail = user?.email ?? "";

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["parking-objects"] });

  // wraps a mutation with toast + cache refresh
  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      refresh();
      toast.success(label);
    } catch (e) {
      toast.error(`${label} failed: ${(e as Error).message}`);
      throw e;
    }
  };

  // ── derived stats, scoped to the lots THIS admin owns ──
  const stats = useMemo(() => {
    const allLots = objects.filter((o) => o.type === ObjectType.PARKING_LOT);
    const lots = allLots.filter((l) => l.createdBy?.userId.email === myEmail);
    const lotIds = new Set(lots.map((l) => l.id?.objectId));
    const sections = objects.filter(
      (o) => o.type === ObjectType.PARKING_SECTION
        && lotIds.has((o.objectDetails as { parentLotId?: string } | undefined)?.parentLotId),
    );
    const slots = objects.filter(
      (o) => o.type === ObjectType.PARKING_SLOT && lotIds.has(det(o).parentLotId),
    );
    const vehicles = objects.filter(
      (o) => o.type === ObjectType.VEHICLE
        && lotIds.has((o.objectDetails as { lotId?: string } | undefined)?.lotId),
    );
    const occupied = slots.filter((s) => s.status === "OCCUPIED").length;
    const faulty = slots.filter((s) => det(s).healthStatus === "FAULTY");
    const free = slots.length - occupied;
    const occupancy = slots.length ? Math.round((occupied / slots.length) * 100) : 0;

    const perLot = lots.map((lot) => {
      const lotId = lot.id?.objectId;
      const lotSlots = slots.filter((s) => det(s).parentLotId === lotId);
      const lotSections = sections.filter(
        (sec) => (sec.objectDetails as { parentLotId?: string })?.parentLotId === lotId,
      );
      const lotOcc = lotSlots.filter((s) => s.status === "OCCUPIED").length;
      return {
        lot, lotId, alias: lot.alias ?? "Lot",
        sections: lotSections,
        slots: lotSlots,
        occupied: lotOcc,
        free: lotSlots.length - lotOcc,
        faulty: lotSlots.filter((s) => det(s).healthStatus === "FAULTY").length,
        occupancy: lotSlots.length ? Math.round((lotOcc / lotSlots.length) * 100) : 0,
      };
    });

    return { lots, sections, slots, vehicles, occupied, free, faulty, occupancy, perLot, totalLots: allLots.length };
  }, [objects, myEmail]);

  // objectId -> {type, alias} for resolving command targets
  const objectMap = useMemo(() => {
    const m = new Map<string, { type: string; alias?: string }>();
    objects.forEach((o) => { if (o.id?.objectId) m.set(o.id.objectId, { type: o.type, alias: o.alias }); });
    return m;
  }, [objects]);

  const recentCommands = useMemo(
    () => [...commands].sort((a, b) =>
      new Date(b.invocationTimestamp ?? 0).getTime() - new Date(a.invocationTimestamp ?? 0).getTime()),
    [commands],
  );

  // ── health check action (UC-10) ──
  const [health, setHealth] = useState<Record<string, FaultySlot[] | "loading">>({});
  const doHealthCheck = async (lotId?: string) => {
    if (!lotId) return;
    setHealth((h) => ({ ...h, [lotId]: "loading" }));
    try {
      const faulty = await runHealthCheck(lotId);
      setHealth((h) => ({ ...h, [lotId]: faulty }));
      toast.success(
        faulty.length === 0 ? "Health check passed — all slots OK" : `Found ${faulty.length} faulty slot(s)`,
      );
    } catch (e) {
      toast.error("Health check failed: " + (e as Error).message);
      setHealth((h) => { const n = { ...h }; delete n[lotId]; return n; });
    }
  };

  const loading = objectsQ.isLoading || usersQ.isLoading || commandsQ.isLoading;
  const isError = objectsQ.isError;
  const lastUpdated = objectsQ.dataUpdatedAt ? new Date(objectsQ.dataUpdatedAt) : null;

  return (
    <div dir="ltr" className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold leading-tight truncate">Smart Parking — Admin Console</h1>
              <p className="text-xs text-muted-foreground truncate">
                {user ? `${user.username || user.email} · ` : ""}System ID: {apiConfig.SYSTEM_ID}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${isError ? "bg-destructive" : "bg-emerald-500"}`} />
              {lastUpdated ? `updated ${format(lastUpdated, "HH:mm:ss")}` : "connecting…"}
            </span>
            <Button variant="outline" size="sm" onClick={() => { objectsQ.refetch(); usersQ.refetch(); commandsQ.refetch(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> App</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} title="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {isError ? (
          <Card className="p-8 text-center text-destructive">
            Could not reach the API at <code>{apiConfig.BASE_URL}</code>. Is the server running?
          </Card>
        ) : (
          <>
            {/* Stat cards (scoped to this admin's lots) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)
              ) : (
                <>
                  <StatCard icon={LayoutGrid} label="My lots" value={stats.lots.length}
                    sub={`of ${stats.totalLots} in system`} />
                  <StatCard icon={MapPin} label="Sections" value={stats.sections.length} />
                  <StatCard icon={Database} label="Slots" value={stats.slots.length}
                    sub={`${stats.occupancy}% full`} tone="primary" />
                  <StatCard icon={CheckCircle2} label="Free now" value={stats.free} tone="ok" />
                  <StatCard icon={Car} label="Vehicle events" value={stats.vehicles.length} />
                  <StatCard icon={AlertTriangle} label="Faulty slots" value={stats.faulty.length}
                    tone={stats.faulty.length ? "danger" : "ok"} />
                </>
              )}
            </div>

            <Tabs defaultValue="lots" className="w-full">
              <TabsList>
                <TabsTrigger value="lots"><LayoutGrid className="w-4 h-4 mr-1.5" /> My Lots ({stats.lots.length})</TabsTrigger>
                <TabsTrigger value="users"><UsersIcon className="w-4 h-4 mr-1.5" /> Users ({users.length})</TabsTrigger>
                <TabsTrigger value="activity"><Activity className="w-4 h-4 mr-1.5" /> Activity ({commands.length})</TabsTrigger>
              </TabsList>

              {/* Lots: health + full CRUD */}
              <TabsContent value="lots" className="space-y-4 mt-4">
                <div className="flex justify-end">
                  <CreateLotDialog onCreate={(input) => act("Lot created", () => createObject(input))} />
                </div>

                {stats.perLot.length === 0 && !loading && (
                  <Card className="p-8 text-center text-muted-foreground">
                    You don't manage any parking lots yet — create your first one.
                  </Card>
                )}

                {stats.perLot.map((l) => {
                  const hc = l.lotId ? health[l.lotId] : undefined;
                  return (
                    <Card key={l.lotId} className="p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-primary" /> {l.alias}
                            <RenameDialog
                              title="Rename lot"
                              current={l.alias}
                              onSave={(name) => act("Lot renamed", () => updateObject(l.lotId!, { alias: name }))}
                            >
                              <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </RenameDialog>
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">id: {l.lotId}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button size="sm" variant="outline" disabled={hc === "loading"}
                            onClick={() => doHealthCheck(l.lotId)}>
                            {hc === "loading"
                              ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Checking…</>
                              : <><Stethoscope className="w-4 h-4 mr-1.5" /> Run health check</>}
                          </Button>
                          <DeleteButton
                            what={`lot "${l.alias}"`}
                            onDelete={() => act("Lot deleted", () => deleteObject(l.lotId!))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                        <Metric label="Sections" value={l.sections.length} />
                        <Metric label="Slots" value={l.slots.length} />
                        <Metric label="Free" value={l.free} tone="ok" />
                        <Metric label="Occupied" value={l.occupied} />
                        <Metric label="Faulty" value={l.faulty} tone={l.faulty ? "danger" : "ok"} />
                      </div>

                      {/* occupancy bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Occupancy</span><span>{l.occupancy}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${l.occupancy}%` }} />
                        </div>
                      </div>

                      {/* health result */}
                      {Array.isArray(hc) && (
                        <div className="mt-4 text-sm">
                          {hc.length === 0 ? (
                            <p className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle2 className="w-4 h-4" /> All slots healthy.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              <p className="flex items-center gap-2 text-destructive font-medium">
                                <AlertTriangle className="w-4 h-4" /> {hc.length} faulty slot(s):
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {hc.map((f) => (
                                  <Badge key={f.slotId} variant="outline" className="border-destructive/40 text-destructive">
                                    {f.alias} · {f.healthStatus}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* section & slot management */}
                      <ManageSections
                        lotId={l.lotId!}
                        sections={l.sections}
                        slots={l.slots}
                        act={act}
                      />
                    </Card>
                  );
                })}
              </TabsContent>

              {/* Users */}
              <TabsContent value="users" className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <CreateUserDialog onCreate={(input) => act("User created", () => createUserAsAdmin(input))} />
                </div>
                <Card className="p-0 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.userId.email}>
                          <TableCell className="text-xl">{u.avatar || "🙂"}</TableCell>
                          <TableCell className="font-medium">{u.username || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{u.userId.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={roleStyle(u.role)}>{u.role}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {users.length === 0 && !loading && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No users.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* Activity / command history */}
              <TabsContent value="activity" className="mt-4">
                <Card className="p-0 overflow-hidden">
                  <ScrollArea className="h-[480px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                          <TableHead className="w-36">Time</TableHead>
                          <TableHead>Command</TableHead>
                          <TableHead>Invoked by</TableHead>
                          <TableHead>Target</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentCommands.map((c, i) => {
                          const targetId = c.targetObject?.id?.objectId;
                          const t = targetId ? objectMap.get(targetId) : undefined;
                          return (
                            <TableRow key={c.id?.commandId ?? i}>
                              <TableCell className="text-xs text-muted-foreground tabular-nums">
                                {c.invocationTimestamp ? format(new Date(c.invocationTimestamp), "dd/MM HH:mm:ss") : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-[11px]">{c.command}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{c.invokedBy?.userId.email ?? "—"}</TableCell>
                              <TableCell className="text-sm">
                                {t ? (
                                  <span><span className="text-muted-foreground">{t.type}</span>{t.alias ? ` · ${t.alias}` : ""}</span>
                                ) : (
                                  <span className="text-muted-foreground font-mono text-xs">{targetId?.slice(0, 8) ?? "—"}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {recentCommands.length === 0 && !loading && (
                          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No commands recorded yet.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

// ── Create-lot dialog ─────────────────────────────────────────────────────────

const CreateLotDialog = ({ onCreate }: { onCreate: (lot: ObjectBoundary) => Promise<unknown> }) => {
  const [open, setOpen] = useState(false);
  const [alias, setAlias] = useState("");
  const [city, setCity] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const lot: ObjectBoundary = {
        type: ObjectType.PARKING_LOT,
        alias: alias.trim(),
        active: true,
        objectDetails: city.trim() ? { address: city.trim() } : {},
      };
      const latN = parseFloat(lat), lngN = parseFloat(lng);
      if (!Number.isNaN(latN) && !Number.isNaN(lngN)) lot.location = { lat: latN, lng: lngN };
      await onCreate(lot);
      setOpen(false);
      setAlias(""); setCity(""); setLat(""); setLng("");
    } catch { /* toast shown by act() */ }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> New lot</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create a parking lot</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lot-name">Name</Label>
            <Input id="lot-name" placeholder="e.g. Dizengoff Center Lot" value={alias}
              onChange={(e) => setAlias(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lot-city">City / address</Label>
            <Input id="lot-city" placeholder="e.g. Tel Aviv" value={city}
              onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lot-lat">Latitude (optional)</Label>
              <Input id="lot-lat" placeholder="32.08" value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lot-lng">Longitude (optional)</Label>
              <Input id="lot-lng" placeholder="34.78" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !alias.trim()}>
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Create lot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Create-user dialog (admins create admins/operators) ──────────────────────

const CreateUserDialog = ({
  onCreate,
}: {
  onCreate: (u: { email: string; password: string; username?: string; role: string }) => Promise<unknown>;
}) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("END_USER");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await onCreate({ email: email.trim(), password, username: username.trim() || undefined, role });
      setOpen(false);
      setEmail(""); setUsername(""); setPassword(""); setRole("END_USER");
    } catch { /* toast shown by act() */ }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><UserPlus className="w-4 h-4 mr-1.5" /> Add user</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create a user</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Email</Label>
            <Input id="u-email" type="email" placeholder="user@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-name">Name</Label>
            <Input id="u-name" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-pass">Password</Label>
            <Input id="u-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">At least 5 chars, incl. a digit and a special char.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="END_USER">END_USER</SelectItem>
                <SelectItem value="OPERATOR">OPERATOR</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !email.trim() || !password}>
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Section & slot management (inside a lot card) ─────────────────────────────

const ManageSections = ({
  lotId, sections, slots, act,
}: {
  lotId: string;
  sections: ObjectBoundary[];
  slots: ObjectBoundary[];
  act: (label: string, fn: () => Promise<unknown>) => Promise<void>;
}) => {
  const [openManage, setOpenManage] = useState(false);
  const [newSection, setNewSection] = useState("");

  const addSection = () =>
    act("Section added", () =>
      createObject({
        type: ObjectType.PARKING_SECTION,
        alias: newSection.trim(),
        active: true,
        objectDetails: { parentLotId: lotId },
      }),
    ).then(() => setNewSection(""));

  return (
    <div className="mt-4 border-t border-border pt-3">
      <button
        onClick={() => setOpenManage((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        {openManage ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Manage sections & slots
      </button>

      {openManage && (
        <div className="mt-3 space-y-4">
          {sections
            .slice()
            .sort((a, b) => (a.alias ?? "").localeCompare(b.alias ?? "", undefined, { numeric: true }))
            .map((sec) => {
              const secId = sec.id?.objectId ?? "";
              const secSlots = slots
                .filter((s) => det(s).parentSectionId === secId)
                .sort((a, b) => (a.alias ?? "").localeCompare(b.alias ?? "", undefined, { numeric: true }));
              return (
                <SectionEditor
                  key={secId}
                  lotId={lotId}
                  section={sec}
                  slots={secSlots}
                  act={act}
                />
              );
            })}
          {sections.length === 0 && (
            <p className="text-sm text-muted-foreground">No sections yet — add the first one.</p>
          )}

          {/* add section */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="New section name (e.g. Section D)"
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              className="max-w-xs h-9"
            />
            <Button size="sm" variant="outline" disabled={!newSection.trim()} onClick={addSection}>
              <Plus className="w-4 h-4 mr-1" /> Add section
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionEditor = ({
  lotId, section, slots, act,
}: {
  lotId: string;
  section: ObjectBoundary;
  slots: ObjectBoundary[];
  act: (label: string, fn: () => Promise<unknown>) => Promise<void>;
}) => {
  const secId = section.id?.objectId ?? "";
  const [newSlot, setNewSlot] = useState("");
  const [newKind, setNewKind] = useState<"REGULAR" | "HANDICAP">("REGULAR");

  const addSlot = () =>
    act("Slot added", () =>
      createObject({
        type: ObjectType.PARKING_SLOT,
        alias: newSlot.trim(),
        status: "FREE",
        active: true,
        objectDetails: {
          parentLotId: lotId,
          parentSectionId: secId,
          slotKind: newKind,
          healthStatus: "OK",
        },
      }),
    ).then(() => setNewSlot(""));

  return (
    <div className="rounded-xl bg-muted/40 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-sm">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          {section.alias}
          <span className="text-xs text-muted-foreground font-normal">({slots.length} slots)</span>
          <RenameDialog
            title="Rename section"
            current={section.alias ?? ""}
            onSave={(name) => act("Section renamed", () => updateObject(secId, { alias: name }))}
          >
            <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
          </RenameDialog>
        </div>
        <DeleteButton
          what={`section "${section.alias}"`}
          size="icon-xs"
          onDelete={() => act("Section deleted", () => deleteObject(secId))}
        />
      </div>

      {/* slot chips */}
      <div className="flex flex-wrap gap-1.5">
        {slots.map((slot) => (
          <SlotChip key={slot.id?.objectId} slot={slot} act={act} />
        ))}
        {slots.length === 0 && <span className="text-xs text-muted-foreground">No slots.</span>}
      </div>

      {/* add slot */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Slot name (e.g. A-12)"
          value={newSlot}
          onChange={(e) => setNewSlot(e.target.value)}
          className="max-w-[150px] h-8 text-sm"
        />
        <Select value={newKind} onValueChange={(v) => setNewKind(v as "REGULAR" | "HANDICAP")}>
          <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="REGULAR">Regular</SelectItem>
            <SelectItem value="HANDICAP">Handicap ♿</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-8" disabled={!newSlot.trim()} onClick={addSlot}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add slot
        </Button>
      </div>
    </div>
  );
};

const SlotChip = ({
  slot, act,
}: {
  slot: ObjectBoundary;
  act: (label: string, fn: () => Promise<unknown>) => Promise<void>;
}) => {
  const d = det(slot);
  const slotId = slot.id?.objectId ?? "";
  const occupied = slot.status === "OCCUPIED";
  const handicap = d.slotKind === "HANDICAP";
  const faulty = d.healthStatus === "FAULTY";

  const toggleStatus = () =>
    act(`Slot ${slot.alias} → ${occupied ? "FREE" : "OCCUPIED"}`, () =>
      updateObject(slotId, { status: occupied ? "FREE" : "OCCUPIED" }));

  // objectDetails is replaced wholesale server-side, so send the full map back
  const toggleKind = () =>
    act(`Slot ${slot.alias} → ${handicap ? "REGULAR" : "HANDICAP"}`, () =>
      updateObject(slotId, {
        objectDetails: { ...(slot.objectDetails ?? {}), slotKind: handicap ? "REGULAR" : "HANDICAP" },
      }));

  const fixHealth = () =>
    act(`Slot ${slot.alias} marked healthy`, () =>
      updateObject(slotId, {
        objectDetails: { ...(slot.objectDetails ?? {}), healthStatus: "OK" },
      }));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title={`${slot.alias} · ${slot.status}${handicap ? " · handicap" : ""}${faulty ? " · FAULTY" : ""}`}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
            faulty
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : occupied
              ? "border-border bg-muted text-muted-foreground"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {handicap && <Accessibility className="w-3 h-3" />}
          {slot.alias}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={toggleStatus}>
          Mark {occupied ? "FREE" : "OCCUPIED"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleKind}>
          Make {handicap ? "regular" : "handicap ♿"}
        </DropdownMenuItem>
        {faulty && (
          <DropdownMenuItem onClick={fixHealth}>Mark healthy (OK)</DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => act(`Slot ${slot.alias} deleted`, () => deleteObject(slotId))}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete slot
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Admin;
