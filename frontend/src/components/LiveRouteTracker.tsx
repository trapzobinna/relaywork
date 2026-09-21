import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Bell, Volume2, ShieldCheck, Clock } from 'lucide-react';
import type { Job } from '../types';

interface LiveRouteTrackerProps {
  job: Job;
  isPro: boolean;
  onArrived?: () => void;
}

export const LiveRouteTracker: React.FC<LiveRouteTrackerProps> = ({ job, isPro, onArrived }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const proMarkerRef = useRef<L.Marker | null>(null);
  const clientMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [proLocation, setProLocation] = useState<{ lat: number; lng: number } | null>(
    job.pro_current_lat && job.pro_current_lng
      ? { lat: job.pro_current_lat, lng: job.pro_current_lng }
      : null
  );
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [hasArrived, setHasArrived] = useState<boolean>(job.has_arrived || false);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(
    job.last_location_updated_at ? new Date(job.last_location_updated_at) : null
  );

  // Prime Web Audio API on user interaction to comply with browser autoplay policies
  const primeAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Play melodic arrival sound alert
  const playArrivalChime = () => {
    try {
      primeAudioContext();
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880.0, now + 0.15); // A5

      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.8);
    } catch (e) {
      console.warn('Audio chime notice:', e);
    }
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const defaultLat = job.latitude || 6.5244;
    const defaultLng = job.longitude || 3.3792;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([defaultLat, defaultLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const clientIcon = L.divIcon({
      className: 'custom-client-pin',
      html: '<div style="background-color: #2563eb; color: white; border-radius: 9999px; padding: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    if (job.latitude && job.longitude) {
      const clientMarker = L.marker([job.latitude, job.longitude], { icon: clientIcon }).addTo(map);
      clientMarker.bindPopup(`<b>Job Destination</b><br>${job.location_address || 'Job Site'}`);
      clientMarkerRef.current = clientMarker;
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Update Pro Marker and straight-line polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const proIcon = L.divIcon({
      className: 'custom-pro-pin',
      html: '<div style="background-color: #10b981; color: white; border-radius: 9999px; padding: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    if (proLocation) {
      if (proMarkerRef.current) {
        proMarkerRef.current.setLatLng([proLocation.lat, proLocation.lng]);
      } else {
        const marker = L.marker([proLocation.lat, proLocation.lng], { icon: proIcon }).addTo(map);
        marker.bindPopup(`<b>${job.pro_name || 'Assigned Pro'}</b><br>Live GPS Location`);
        proMarkerRef.current = marker;
      }

      // Draw direct straight-line route between Pro and Client destination
      if (job.latitude && job.longitude) {
        const latlngs: L.LatLngExpression[] = [
          [proLocation.lat, proLocation.lng],
          [job.latitude, job.longitude],
        ];

        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs(latlngs);
        } else {
          routeLineRef.current = L.polyline(latlngs, {
            color: '#3b82f6',
            dashArray: '6, 8',
            weight: 3.5,
            opacity: 0.8,
          }).addTo(map);
        }

        const bounds = L.latLngBounds([
          [proLocation.lat, proLocation.lng],
          [job.latitude, job.longitude],
        ]);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [proLocation]);

  // 3. Connect to existing WebSocket for LOCATION_UPDATE and PRO_ARRIVED events
  useEffect(() => {
    const token = localStorage.getItem('relaywork_token') || localStorage.getItem('token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/jobs/${job.id}/chat?token=${token}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'LOCATION_UPDATE') {
          setProLocation({ lat: data.latitude, lng: data.longitude });
          setDistanceMeters(data.distance_meters);
          setEtaMinutes(data.eta_minutes);
          setLastPingTime(new Date());
        } else if (data.type === 'PRO_ARRIVED') {
          setHasArrived(true);
          playArrivalChime();
          if (onArrived) onArrived();
        }
      } catch (err) {
        console.error('WS Location parse error:', err);
      }
    };

    return () => {
      socket.close();
    };
  }, [job.id]);

  const formattedDistance =
    distanceMeters !== null
      ? distanceMeters < 1000
        ? `${Math.round(distanceMeters)} meters`
        : `${(distanceMeters / 1000).toFixed(1)} km`
      : 'Calculating...';

  return (
    <div
      onClick={primeAudioContext}
      className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden space-y-4"
    >
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/20 text-teal-300 rounded-2xl border border-teal-400/30">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-base text-white">Live Dispatch & GPS Route</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-400/20 text-teal-300 border border-teal-400/30 uppercase">
                {hasArrived ? 'Arrived' : 'En Route'}
              </span>
            </div>
            <p className="text-xs text-blue-200">
              {isPro
                ? 'Your GPS coordinates are streaming live to your client.'
                : `${job.pro_name || 'Your Pro'} is navigating to your destination.`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-xs">
          <div>
            <span className="text-blue-300 block text-[10px] uppercase font-bold">Distance</span>
            <span className="font-black text-white text-sm">{formattedDistance}</span>
          </div>
          {etaMinutes !== null && !hasArrived && (
            <div className="border-l border-white/20 pl-3">
              <span className="text-blue-300 block text-[10px] uppercase font-bold">Est. Arrival</span>
              <span className="font-black text-teal-300 text-sm">~{etaMinutes} mins</span>
            </div>
          )}
        </div>
      </div>

      {hasArrived && (
        <div className="mx-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Bell className="w-5 h-5 text-emerald-600 animate-bounce" />
            </div>
            <div>
              <p className="font-black text-sm text-emerald-950">Pro Has Arrived!</p>
              <p className="text-xs text-emerald-700">
                {job.pro_name || 'The trade specialist'} is within 500 meters of the site.
              </p>
            </div>
          </div>
          <button
            onClick={playArrivalChime}
            title="Replay arrival sound"
            className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition flex items-center space-x-1 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Live Alert</span>
          </button>
        </div>
      )}

      <div className="px-6 pb-2">
        <div
          ref={mapContainerRef}
          className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-gray-200 shadow-inner z-0"
        />
      </div>

      <div className="px-6 pb-5 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2 border-t pt-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>
            Last ping:{' '}
            {lastPingTime ? lastPingTime.toLocaleTimeString() : 'Connecting GPS...'} (Straight-line estimate)
          </span>
        </div>
        <div className="flex items-center space-x-1 text-emerald-600 font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Encrypted WebSockets</span>
        </div>
      </div>
    </div>
  );
};
