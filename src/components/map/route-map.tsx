"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Types for our map data
export interface MapStore {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  kmRoundTrip?: number | null;
}

export interface MapTeam {
  id: string;
  jobType: string;
  city: string;
  employeeNames: string[];
  driverName: string | null;
  vehicleName: string | null;
  stores: MapStore[];
}

interface RouteMapProps {
  stores?: MapStore[];
  teams?: MapTeam[];
  depot?: { lat: number; lng: number };
  optimizedRoute?: { id: string; lat: number; lng: number; order: number; name: string }[];
  height?: string;
}

const JOB_COLORS: Record<string, string> = {
  MAN: "#3b82f6",  // blue
  REF: "#f59e0b",  // amber
  OBRA: "#10b981", // emerald
};

/**
 * RouteMap — uses Leaflet via dynamic import (SSR-safe).
 * Shows store pins + optional route polylines.
 */
export function RouteMap({
  stores = [],
  teams = [],
  depot,
  optimizedRoute,
  height = "400px",
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) return; // Already initialized

    let cancelled = false;

    async function initMap() {
      // Dynamic import of leaflet (client-only)
      const L = (await import("leaflet")).default;

      // Import CSS via link tag (avoids TS module resolution for CSS)
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (cancelled || !mapRef.current) return;

      // Default center: Brazil center
      const defaultCenter: [number, number] = [-22.3, -49.0];
      const map = L.map(mapRef.current).setView(defaultCenter, 6);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      mapInstance.current = map;

      // Collect all points for bounds
      const allPoints: [number, number][] = [];

      // Add depot marker
      if (depot) {
        const depotIcon = L.divIcon({
          className: "custom-depot-icon",
          html: `<div style="width:14px;height:14px;background:#ef4444;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([depot.lat, depot.lng], { icon: depotIcon })
          .addTo(map)
          .bindPopup("<b>Base</b>");
        allPoints.push([depot.lat, depot.lng]);
      }

      // Add store markers
      for (const store of stores) {
        if (!store.lat || !store.lng) continue;
        const storeIcon = L.divIcon({
          className: "custom-store-icon",
          html: `<div style="width:10px;height:10px;background:#8b5cf6;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        L.marker([store.lat, store.lng], { icon: storeIcon })
          .addTo(map)
          .bindPopup(`<b>${store.name}</b><br>${store.city}${store.kmRoundTrip ? `<br>${store.kmRoundTrip} km` : ""}`);
        allPoints.push([store.lat, store.lng]);
      }

      // Add team route polylines
      for (const team of teams) {
        const color = JOB_COLORS[team.jobType] || "#6b7280";
        const teamPoints: [number, number][] = [];

        if (depot) teamPoints.push([depot.lat, depot.lng]);

        for (const store of team.stores) {
          if (!store.lat || !store.lng) continue;
          teamPoints.push([store.lat, store.lng]);
          allPoints.push([store.lat, store.lng]);

          // Store pin with team color
          const icon = L.divIcon({
            className: "custom-team-icon",
            html: `<div style="width:12px;height:12px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });
          L.marker([store.lat, store.lng], { icon: icon })
            .addTo(map)
            .bindPopup(
              `<b>${store.name}</b><br>${team.employeeNames.join(", ")}<br><i>${team.vehicleName ?? ""}</i>`
            );
        }

        if (depot) teamPoints.push([depot.lat, depot.lng]); // Return

        if (teamPoints.length >= 2) {
          L.polyline(teamPoints, {
            color,
            weight: 3,
            opacity: 0.7,
            dashArray: "8, 4",
          }).addTo(map);
        }
      }

      // Draw optimized route
      if (optimizedRoute && optimizedRoute.length >= 2) {
        const routePoints: [number, number][] = [];
        if (depot) routePoints.push([depot.lat, depot.lng]);

        for (const stop of optimizedRoute) {
          routePoints.push([stop.lat, stop.lng]);
          allPoints.push([stop.lat, stop.lng]);

          const icon = L.divIcon({
            className: "custom-route-icon",
            html: `<div style="width:22px;height:22px;background:#3b82f6;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${stop.order}</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
          L.marker([stop.lat, stop.lng], { icon })
            .addTo(map)
            .bindPopup(`<b>#${stop.order} ${stop.name}</b>`);
        }

        if (depot) routePoints.push([depot.lat, depot.lng]); // Return

        L.polyline(routePoints, {
          color: "#3b82f6",
          weight: 3,
          opacity: 0.8,
        }).addTo(map);
      }

      // Fit bounds
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      setLoading(false);
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [stores, teams, depot, optimizedRoute]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-zinc-800" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/80">
          <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
        </div>
      )}
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
