"use client";

import { RouteMap } from "@/components/map/route-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { haversineDistance, formatDistance } from "@/lib/geo";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MapPin,
  Navigation,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo, type DragEvent } from "react";
import { toast } from "sonner";

// Types
interface TeamMember {
  employeeId: string;
  employeeName: string;
  rank: number;
  isLeader: boolean;
}

interface Team {
  id: string;
  name: string;
  driverId: string | null;
  driverName: string | null;
  vehicleId: string | null;
  vehicleName: string | null;
  vehiclePlate: string | null;
  isActive: boolean;
  members: TeamMember[];
}

interface StoreInfo {
  id: string;
  sigla: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
}

interface ServiceOrder {
  id: string;
  orderNumber: number;
  name: string;
  status: string;
  priority: number;
  type: string;
  stores: { store: StoreInfo }[];
  serviceTypes: { serviceType: { id: string; name: string } }[];
}

interface Assignment {
  id: string;
  teamId: string;
  date: string;
  endDate: string | null;
  serviceOrderId: string | null;
  routeOrder: number | null;
  serviceOrder: ServiceOrder | null;
  notes: string | null;
}

interface Props {
  teams: Team[];
  assignments: Assignment[];
  serviceOrders: ServiceOrder[];
  stores: { id: string; sigla: string; city: string; latitude: number; longitude: number }[];
}

// Helper to get Monday of a week
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
  return `${formatter.format(monday)} - ${formatter.format(sunday)}`;
}

// Distinct colors per team (up to 8 teams)
const TEAM_COLORS = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

// Rio Claro-SP headquarters
const DEPOT = { lat: -22.4149, lng: -47.5651 };

export function ItinerariosView({ teams, assignments: initialAssignments, serviceOrders, stores }: Props) {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(() => getMondayOfWeek(new Date()));
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [localAssignments, setLocalAssignments] = useState(initialAssignments);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter assignments for current week
  const weekEnd = new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekAssignments = useMemo(() => {
    return localAssignments.filter((a) => {
      const date = new Date(a.date);
      return date >= currentWeek && date < weekEnd;
    });
  }, [localAssignments, currentWeek, weekEnd]);

  // Filter by selected team if any
  const filteredAssignments = useMemo(() => {
    if (!selectedTeamId) return weekAssignments;
    return weekAssignments.filter((a) => a.teamId === selectedTeamId);
  }, [weekAssignments, selectedTeamId]);

  // Group assignments by team for map display
  const teamRoutes = useMemo(() => {
    const routesByTeam: Record<string, { team: Team; stops: { id: string; lat: number; lng: number; order: number; name: string; city: string }[] }> = {};

    for (const assignment of filteredAssignments) {
      if (!assignment.serviceOrder) continue;

      const team = teams.find((t) => t.id === assignment.teamId);
      if (!team) continue;

      if (!routesByTeam[team.id]) {
        routesByTeam[team.id] = { team, stops: [] };
      }

      for (const storeRef of assignment.serviceOrder.stores) {
        const store = storeRef.store;
        if (store.latitude && store.longitude) {
          routesByTeam[team.id].stops.push({
            id: assignment.id,
            lat: store.latitude,
            lng: store.longitude,
            order: assignment.routeOrder ?? routesByTeam[team.id].stops.length + 1,
            name: store.sigla,
            city: store.city,
          });
        }
      }
    }

    return Object.values(routesByTeam);
  }, [filteredAssignments, teams]);

  // Build optimizedRoute for the map
  const optimizedRoute = useMemo(() => {
    if (selectedTeamId) {
      const teamRoute = teamRoutes.find((r) => r.team.id === selectedTeamId);
      if (teamRoute) {
        return teamRoute.stops.sort((a, b) => a.order - b.order);
      }
    }
    // If no team selected, show all stops
    const allStops: { id: string; lat: number; lng: number; order: number; name: string }[] = [];
    let orderCounter = 1;
    for (const route of teamRoutes) {
      for (const stop of route.stops) {
        allStops.push({ ...stop, order: orderCounter++ });
      }
    }
    return allStops;
  }, [teamRoutes, selectedTeamId]);

  // Stable color assignment per team (by index in the teams array)
  const teamColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    teams.forEach((t, i) => {
      map[t.id] = TEAM_COLORS[i % TEAM_COLORS.length];
    });
    return map;
  }, [teams]);

  // Build MapTeam array for RouteMap
  const mapTeams = useMemo(() => {
    return teamRoutes.map((route) => ({
      id: route.team.id,
      jobType: "MAN",
      city: route.stops[0]?.city ?? "",
      employeeNames: route.team.members.map((m) => m.employeeName),
      driverName: route.team.driverName,
      vehicleName: route.team.vehicleName,
      color: teamColorMap[route.team.id],
      stores: route.stops.map((s) => ({
        id: s.id,
        name: s.name,
        city: s.city,
        lat: s.lat,
        lng: s.lng,
      })),
    }));
  }, [teamRoutes, teamColorMap]);

  // Calculate route statistics
  const routeStats = useMemo(() => {
    const stops = selectedTeamId
      ? teamRoutes.find((r) => r.team.id === selectedTeamId)?.stops ?? []
      : optimizedRoute;

    if (stops.length < 2) return { totalKm: 0, stopCount: stops.length };

    let totalKm = 0;
    const sortedStops = [...stops].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sortedStops.length - 1; i++) {
      totalKm += haversineDistance(
        { lat: sortedStops[i].lat, lng: sortedStops[i].lng },
        { lat: sortedStops[i + 1].lat, lng: sortedStops[i + 1].lng }
      );
    }

    return { totalKm, stopCount: stops.length };
  }, [teamRoutes, selectedTeamId, optimizedRoute]);

  // Get stops list for the table (selected team or all)
  const tableStops = useMemo(() => {
    const stopsWithInfo: {
      assignmentId: string;
      order: number;
      storeName: string;
      city: string;
      osNumber: number;
      osName: string;
      status: string;
      type: string;
      lat: number;
      lng: number;
      kmFromPrev: number;
      teamId: string;
      teamName: string;
      date: string;
    }[] = [];

    const relevantAssignments = selectedTeamId
      ? filteredAssignments.filter((a) => a.teamId === selectedTeamId)
      : filteredAssignments;

    // Sort by routeOrder, then date
    const sorted = [...relevantAssignments].sort((a, b) => {
      if (a.routeOrder !== null && b.routeOrder !== null) {
        return a.routeOrder - b.routeOrder;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    let prevPoint: { lat: number; lng: number } | null = null;

    for (const assignment of sorted) {
      if (!assignment.serviceOrder) continue;

      const team = teams.find((t) => t.id === assignment.teamId);
      const store = assignment.serviceOrder.stores[0]?.store;

      if (store && store.latitude && store.longitude) {
        const kmFromPrev = prevPoint
          ? haversineDistance(prevPoint, { lat: store.latitude, lng: store.longitude })
          : 0;

        stopsWithInfo.push({
          assignmentId: assignment.id,
          order: stopsWithInfo.length + 1,
          storeName: store.sigla,
          city: store.city,
          osNumber: assignment.serviceOrder.orderNumber,
          osName: assignment.serviceOrder.name,
          status: assignment.serviceOrder.status,
          type: assignment.serviceOrder.type,
          lat: store.latitude,
          lng: store.longitude,
          kmFromPrev,
          teamId: assignment.teamId,
          teamName: team?.name ?? "",
          date: assignment.date,
        });

        prevPoint = { lat: store.latitude, lng: store.longitude };
      }
    }

    return stopsWithInfo;
  }, [filteredAssignments, selectedTeamId, teams]);

  // Week navigation
  function goToPreviousWeek() {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeek(newWeek);
    router.refresh();
  }

  function goToNextWeek() {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeek(newWeek);
    router.refresh();
  }

  function goToCurrentWeek() {
    setCurrentWeek(getMondayOfWeek(new Date()));
    router.refresh();
  }

  // Drag and drop handlers
  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: DragEvent<HTMLTableRowElement>, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;

    setLocalAssignments((prev) => {
      // Get current order of the selected team's assignments
      const teamAssignments = selectedTeamId
        ? prev.filter((a) => a.teamId === selectedTeamId)
        : prev;

      const sortedIds = tableStops.map((s) => s.assignmentId);
      const draggedId = sortedIds[dragIdx];
      const targetId = sortedIds[idx];

      // Swap in sortedIds
      sortedIds.splice(dragIdx, 1);
      sortedIds.splice(idx, 0, draggedId);

      // Update routeOrder for all affected assignments
      return prev.map((a) => {
        const newOrder = sortedIds.indexOf(a.id);
        if (newOrder !== -1) {
          return { ...a, routeOrder: newOrder + 1 };
        }
        return a;
      });
    });

    setDragIdx(idx);
  }

  function handleDragEnd() {
    setDragIdx(null);
    // Save the new order
    saveRouteOrder();
  }

  async function saveRouteOrder() {
    setIsSaving(true);
    try {
      const updates = tableStops.map((stop, idx) => ({
        id: stop.assignmentId,
        routeOrder: idx + 1,
      }));

      const res = await fetch("/api/itinerarios/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: updates }),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success("Ordem atualizada");
    } catch (err) {
      toast.error("Erro ao salvar ordem");
    } finally {
      setIsSaving(false);
    }
  }

  async function optimizeRoute() {
    if (!selectedTeamId) {
      toast.error("Selecione uma equipe primeiro");
      return;
    }

    const teamStops = tableStops.filter((s) => {
      const assignment = localAssignments.find((a) => a.id === s.assignmentId);
      return assignment?.teamId === selectedTeamId;
    });

    if (teamStops.length < 2) {
      toast.error("Precisa de pelo menos 2 paradas para otimizar");
      return;
    }

    setIsSaving(true);
    try {
      const points = teamStops.map((s) => ({
        id: s.assignmentId,
        name: s.storeName,
        lat: s.lat,
        lng: s.lng,
      }));

      const res = await fetch("/api/rotas/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });

      if (!res.ok) throw new Error("Failed to optimize");

      const data = await res.json();

      // Update local state with optimized order
      setLocalAssignments((prev) =>
        prev.map((a) => {
          const optimizedStop = data.optimizedRoute.find((s: any) => s.id === a.id);
          if (optimizedStop) {
            return { ...a, routeOrder: optimizedStop.order };
          }
          return a;
        })
      );

      // Save to DB
      const updates = data.optimizedRoute.map((s: any) => ({
        id: s.id,
        routeOrder: s.order,
      }));

      await fetch("/api/itinerarios/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: updates }),
      });

      toast.success(`Rota otimizada! Economia de ${data.savingsKm} km (${data.savingsPercent}%)`);
    } catch (err) {
      toast.error("Erro ao otimizar rota");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with week nav and team selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToCurrentWeek} className="min-w-[180px]">
            {formatDateRange(currentWeek)}
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Team Selector */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedTeamId ?? "all"}
            onValueChange={(v) => setSelectedTeamId(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as equipes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as equipes</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTeamId && (
            <Button variant="outline" onClick={optimizeRoute} disabled={isSaving}>
              <Navigation className="mr-2 h-4 w-4" />
              Otimizar Rota
            </Button>
          )}
        </div>
      </div>

      {/* Split Layout */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left: Map (60%) */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-emerald-400" />
                Mapa de Rotas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RouteMap
                teams={selectedTeamId ? [] : mapTeams}
                optimizedRoute={selectedTeamId ? optimizedRoute : undefined}
                routeColor={selectedTeamId ? teamColorMap[selectedTeamId] : undefined}
                depot={DEPOT}
                height="500px"
              />
              {/* Color-coded team legend */}
              {teamRoutes.length > 0 && !selectedTeamId && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 border border-white/30" />
                    Base (Rio Claro)
                  </div>
                  {teamRoutes.map((route) => (
                    <div key={route.team.id} className="flex items-center gap-1.5 text-xs text-zinc-300">
                      <div
                        className="h-2.5 w-2.5 rounded-full border border-white/30"
                        style={{ backgroundColor: teamColorMap[route.team.id] }}
                      />
                      {route.team.name}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Stats + Table (40%) */}
        <div className="space-y-4 lg:col-span-2">
          {/* Route Stats */}
          <Card>
            <CardContent className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {routeStats.stopCount}
                </div>
                <div className="text-xs text-zinc-400">Paradas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-sky-400">
                  {formatDistance(routeStats.totalKm)}
                </div>
                <div className="text-xs text-zinc-400">Distância Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {selectedTeamId ? 1 : teamRoutes.length}
                </div>
                <div className="text-xs text-zinc-400">
                  {selectedTeamId ? "Equipe" : "Equipes"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stops Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-sky-400" />
                  Paradas da Rota
                </span>
                {isSaving && (
                  <RefreshCw className="h-4 w-4 animate-spin text-zinc-400" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tableStops.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <MapPin className="mb-2 h-8 w-8" />
                  <p>Nenhuma parada programada</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead>OS</TableHead>
                        {!selectedTeamId && <TableHead>Equipe</TableHead>}
                        <TableHead className="text-right">Km</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableStops.map((stop, idx) => (
                        <TableRow
                          key={stop.assignmentId}
                          draggable={!!selectedTeamId}
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`${
                            selectedTeamId ? "cursor-grab active:cursor-grabbing" : ""
                          } ${dragIdx === idx ? "opacity-50" : ""}`}
                        >
                          <TableCell className="text-zinc-500">
                            {selectedTeamId && (
                              <GripVertical className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: teamColorMap[stop.teamId] ?? "#3b82f6" }}
                            >
                              {stop.order}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{stop.storeName}</div>
                            <div className="text-xs text-zinc-500">{stop.city}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">#{stop.osNumber}</div>
                            <div className="max-w-[120px] truncate text-xs text-zinc-500">
                              {stop.osName}
                            </div>
                          </TableCell>
                          {!selectedTeamId && (
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {stop.teamName}
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell className="text-right text-sm text-zinc-400">
                            {idx > 0 ? formatDistance(stop.kmFromPrev) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Team Info */}
          {selectedTeamId && (
            <Card>
              <CardContent className="pt-4">
                {(() => {
                  const team = teams.find((t) => t.id === selectedTeamId);
                  if (!team) return null;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm">
                          {team.members.map((m) => m.employeeName).join(", ") || "Sem membros"}
                        </span>
                      </div>
                      {team.vehicleName && (
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-zinc-400" />
                          <span className="text-sm">
                            {team.vehicleName} ({team.vehiclePlate})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
