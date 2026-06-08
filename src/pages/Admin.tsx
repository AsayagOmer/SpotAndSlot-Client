import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Shield, ArrowLeft, Users as UsersIcon, Activity, Car, LayoutGrid, MapPin,
  RefreshCw, AlertTriangle, CheckCircle2, Stethoscope, Loader2, Database,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllObjects, useAdminUsers, useAdminCommands } from "@/hooks/useParkingData";
import {
  ObjectType, apiConfig, runHealthCheck,
  type ObjectBoundary, type SlotDetails, type FaultySlot,
} from "@/lib/api";

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

const Admin = () => {
  const objectsQ = useAllObjects();
  const usersQ = useAdminUsers();
  const commandsQ = useAdminCommands();

  const objects = objectsQ.data ?? [];
  const users = usersQ.data ?? [];
  const commands = commandsQ.data ?? [];

  // ── derived system stats ──
  const stats = useMemo(() => {
    const lots = objects.filter((o) => o.type === ObjectType.PARKING_LOT);
    const sections = objects.filter((o) => o.type === ObjectType.PARKING_SECTION);
    const slots = objects.filter((o) => o.type === ObjectType.PARKING_SLOT);
    const vehicles = objects.filter((o) => o.type === ObjectType.VEHICLE);
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
        sections: lotSections.length,
        slots: lotSlots.length,
        occupied: lotOcc,
        free: lotSlots.length - lotOcc,
        faulty: lotSlots.filter((s) => det(s).healthStatus === "FAULTY").length,
        occupancy: lotSlots.length ? Math.round((lotOcc / lotSlots.length) * 100) : 0,
      };
    });

    return { lots, sections, slots, vehicles, occupied, free, faulty, occupancy, perLot };
  }, [objects]);

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
              <p className="text-xs text-muted-foreground truncate">System ID: {apiConfig.SYSTEM_ID}</p>
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
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)
              ) : (
                <>
                  <StatCard icon={LayoutGrid} label="Parking lots" value={stats.lots.length} />
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
                <TabsTrigger value="lots"><LayoutGrid className="w-4 h-4 mr-1.5" /> Lots & Health</TabsTrigger>
                <TabsTrigger value="users"><UsersIcon className="w-4 h-4 mr-1.5" /> Users ({users.length})</TabsTrigger>
                <TabsTrigger value="activity"><Activity className="w-4 h-4 mr-1.5" /> Activity ({commands.length})</TabsTrigger>
              </TabsList>

              {/* Lots & Health */}
              <TabsContent value="lots" className="space-y-4 mt-4">
                {stats.perLot.length === 0 && !loading && (
                  <Card className="p-8 text-center text-muted-foreground">No parking lots in the system.</Card>
                )}
                {stats.perLot.map((l) => {
                  const hc = l.lotId ? health[l.lotId] : undefined;
                  return (
                    <Card key={l.lotId} className="p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-primary" /> {l.alias}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">id: {l.lotId}</p>
                        </div>
                        <Button size="sm" variant="outline" disabled={hc === "loading"}
                          onClick={() => doHealthCheck(l.lotId)}>
                          {hc === "loading"
                            ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Checking…</>
                            : <><Stethoscope className="w-4 h-4 mr-1.5" /> Run health check</>}
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                        <Metric label="Sections" value={l.sections} />
                        <Metric label="Slots" value={l.slots} />
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
                    </Card>
                  );
                })}
              </TabsContent>

              {/* Users */}
              <TabsContent value="users" className="mt-4">
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

const Metric = ({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "ok" | "danger" }) => {
  const c = tone === "ok" ? "text-emerald-600" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center">
      <div className={`text-xl font-bold tabular-nums ${c}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
};

export default Admin;
