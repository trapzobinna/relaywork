import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ProProfile } from '../types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  center: [number, number];
  pros: ProProfile[];
  selectedPro?: ProProfile | null;
  onSelectPro?: (pro: ProProfile) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  center,
  pros,
  onSelectPro,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(center, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(center);
    }

    return () => {
      // Don't unmount map unless component unmounts
    };
  }, [center[0], center[1]]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Client user location circle
    L.circle(center, {
      radius: 600,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
    }).addTo(markersLayerRef.current);

    // Pros markers
    pros.forEach((pro) => {
      const marker = L.marker([pro.latitude, pro.longitude]).addTo(markersLayerRef.current!);
      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 140px; padding: 4px;">
          <strong style="font-size: 13px; color: #0f172a;">${pro.business_name || pro.user?.full_name || 'Verified Pro'}</strong>
          <div style="color: #2563eb; font-size: 11px; font-weight: 600; margin-top: 2px;">${pro.category?.name || 'Skilled Pro'}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">₦${(pro.hourly_rate || 5000).toLocaleString()}/hr • ⭐ ${(pro.rating_avg || 5.0).toFixed(1)}</div>
          ${pro.distance_km !== undefined ? `<div style="color: #10b981; font-size: 11px; font-weight: 500; margin-top: 2px;">${pro.distance_km.toFixed(1)} km away</div>` : ''}
        </div>
      `;
      marker.bindPopup(popupHtml);
      if (onSelectPro) {
        marker.on('click', () => onSelectPro(pro));
      }
    });
  }, [pros, center, onSelectPro]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative min-h-[400px]">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '400px' }} />
    </div>
  );
};
