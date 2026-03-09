"use client";

import dynamic from "next/dynamic";

const MapPreviewInner = dynamic(
  () =>
    import("@/components/map-preview-inner").then((m) => m.MapPreviewInner),
  { ssr: false, loading: () => <div className="bg-muted animate-pulse rounded-md" style={{ height: "100%", width: "100%" }} /> },
);

interface MapPreviewProps {
  lat: number;
  lng: number;
  className?: string;
}

export function MapPreview({ lat, lng, className }: MapPreviewProps) {
  return <MapPreviewInner lat={lat} lng={lng} className={className} />;
}
