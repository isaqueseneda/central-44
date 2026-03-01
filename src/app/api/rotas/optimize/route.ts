import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Point {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * Haversine distance in km between two points
 */
function haversine(a: Point, b: Point): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Build distance matrix
 */
function buildDistMatrix(points: Point[]): number[][] {
  const n = points.length;
  const dist = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversine(points[i], points[j]);
      dist[i][j] = d;
      dist[j][i] = d;
    }
  }
  return dist;
}

/**
 * Nearest-neighbor heuristic for TSP
 */
function nearestNeighbor(dist: number[][], startIdx: number): number[] {
  const n = dist.length;
  const visited = new Set<number>([startIdx]);
  const route = [startIdx];

  let current = startIdx;
  while (visited.size < n) {
    let nearest = -1;
    let nearestDist = Infinity;
    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && dist[current][i] < nearestDist) {
        nearest = i;
        nearestDist = dist[current][i];
      }
    }
    if (nearest === -1) break;
    visited.add(nearest);
    route.push(nearest);
    current = nearest;
  }

  return route;
}

/**
 * 2-opt improvement
 */
function twoOpt(route: number[], dist: number[][]): number[] {
  const n = route.length;
  let improved = true;
  let best = [...route];

  while (improved) {
    improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const d1 = dist[best[i - 1]][best[i]] + dist[best[j]][best[(j + 1) % n]];
        const d2 = dist[best[i - 1]][best[j]] + dist[best[i]][best[(j + 1) % n]];

        if (d2 < d1 - 0.001) {
          const newRoute = [...best];
          let left = i;
          let right = j;
          while (left < right) {
            [newRoute[left], newRoute[right]] = [newRoute[right], newRoute[left]];
            left++;
            right--;
          }
          best = newRoute;
          improved = true;
        }
      }
    }
  }

  return best;
}

/**
 * Calculate total route distance
 */
function routeDistance(route: number[], dist: number[][]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += dist[route[i]][route[i + 1]];
  }
  total += dist[route[route.length - 1]][route[0]];
  return total;
}

/**
 * POST /api/rotas/optimize
 * Body: { storeIds: string[] } OR { points: { id, name, lat, lng }[] }
 * Optional: { originLat, originLng } for depot location
 *
 * Returns optimized route order with estimated km.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    let points: Point[] = [];

    if (body.storeIds && Array.isArray(body.storeIds)) {
      const stores = await prisma.store.findMany({
        where: {
          id: { in: body.storeIds },
          latitude: { not: null },
          longitude: { not: null },
        },
        select: { id: true, sigla: true, city: true, latitude: true, longitude: true },
      });

      points = stores
        .filter((s) => s.latitude != null && s.longitude != null && s.latitude !== 0)
        .map((s) => ({
          id: s.id,
          name: s.sigla || s.city,
          lat: s.latitude!,
          lng: s.longitude!,
        }));
    } else if (body.points && Array.isArray(body.points)) {
      points = body.points;
    }

    if (points.length < 2) {
      return NextResponse.json(
        { error: "Pelo menos 2 locais geocodificados são necessários" },
        { status: 400 }
      );
    }

    // Add depot (origin)
    const originLat = body.originLat ?? -22.3361; // Default: Bauru, SP approx
    const originLng = body.originLng ?? -49.0595;

    const depot: Point = { id: "depot", name: "Base", lat: originLat, lng: originLng };
    const allPoints = [depot, ...points];

    const dist = buildDistMatrix(allPoints);

    // Solve: nearest-neighbor + 2-opt
    const nnRoute = nearestNeighbor(dist, 0);
    const optimizedRoute = twoOpt(nnRoute, dist);

    const optimizedKm = routeDistance(optimizedRoute, dist);

    // Naive distance for comparison
    const naiveRoute = Array.from({ length: allPoints.length }, (_, i) => i);
    const naiveKm = routeDistance(naiveRoute, dist);

    const savings = naiveKm - optimizedKm;
    const savingsPercent = naiveKm > 0 ? (savings / naiveKm) * 100 : 0;

    const orderedStops = optimizedRoute
      .filter((idx) => idx !== 0)
      .map((idx, order) => ({
        ...allPoints[idx],
        order: order + 1,
      }));

    return NextResponse.json({
      optimizedRoute: orderedStops,
      totalKm: Math.round(optimizedKm * 10) / 10,
      naiveKm: Math.round(naiveKm * 10) / 10,
      savingsKm: Math.round(savings * 10) / 10,
      savingsPercent: Math.round(savingsPercent * 10) / 10,
      depot: { lat: originLat, lng: originLng },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Route optimization failed" },
      { status: 500 }
    );
  }
}
