import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, Navigation, Phone, Clock, Shield, AlertTriangle, Layers } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    onNavigate?: (destination?: { coordinates: [number, number]; name: string; icon: string }) => void;
}

// Hazard Zones Data
const HAZARD_ZONES = [
    {
        id: 'wildfire-zone',
        type: 'fire',
        name: 'Active Wildfire Zone',
        severity: 'critical',
        description: 'Active wildfire spreading northeast. Immediate evacuation required.',
        icon: '🔥',
        color: '#ef4444',
        coordinates: [
            [-122.425, 37.782],
            [-122.410, 37.782],
            [-122.410, 37.770],
            [-122.425, 37.770],
            [-122.425, 37.782],
        ],
        center: [-122.4175, 37.776] as [number, number],
    },
    {
        id: 'flood-risk',
        type: 'flood',
        name: 'Flood Risk Area',
        severity: 'warning',
        description: 'Waterfront area prone to storm surge flooding. Monitor tide levels.',
        icon: '🌊',
        color: '#3b82f6',
        coordinates: [
            [-122.395, 37.795],
            [-122.385, 37.795],
            [-122.385, 37.785],
            [-122.395, 37.785],
            [-122.395, 37.795],
        ],
        center: [-122.390, 37.790] as [number, number],
    },
];

// Point-in-polygon check using ray casting algorithm
function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

// Check if a point is inside any hazard zone
function isInHazardZone(coords: [number, number]): { inZone: boolean; zoneName?: string } {
    for (const zone of HAZARD_ZONES) {
        if (isPointInPolygon(coords, zone.coordinates)) {
            return { inZone: true, zoneName: zone.name };
        }
    }
    return { inZone: false };
}

// Resource Markers Data (inHazardZone calculated dynamically)
const RESOURCE_MARKERS_RAW = [
    { id: 'shelter-1', name: 'Moscone Center Shelter', type: 'shelter', icon: '🏠', status: 'open', capacity: '450/500', coordinates: [-122.4010, 37.7830] as [number, number], phone: '(415) 555-0100', hours: '24/7' },
    { id: 'hospital-1', name: 'SF General Hospital', type: 'hospital', icon: '🏥', status: 'open', capacity: 'Trauma Center', coordinates: [-122.4050, 37.7550] as [number, number], phone: '(415) 206-8000', hours: '24/7' },
    { id: 'fire-1', name: 'Fire Station 7', type: 'fire', icon: '🚒', status: 'open', capacity: 'Active Response', coordinates: [-122.4150, 37.7750] as [number, number], phone: '(415) 558-3200', hours: '24/7' },
    { id: 'police-1', name: 'SFPD Mission Station', type: 'police', icon: '🚔', status: 'open', capacity: 'Patrol Unit', coordinates: [-122.4220, 37.7640] as [number, number], phone: '(415) 558-5400', hours: '24/7' },
    { id: 'supplies-1', name: 'Red Cross Distribution', type: 'supplies', icon: '📦', status: 'open', capacity: 'Water, Food, Blankets', coordinates: [-122.4080, 37.7700] as [number, number], phone: '(415) 555-0200', hours: '8AM-8PM' },
];

// Dynamically calculate inHazardZone for each resource
const RESOURCE_MARKERS = RESOURCE_MARKERS_RAW.map(resource => ({
    ...resource,
    inHazardZone: isInHazardZone(resource.coordinates).inZone,
    hazardZoneName: isInHazardZone(resource.coordinates).zoneName,
}));

interface SelectedItem {
    type: 'hazard' | 'resource';
    data: typeof HAZARD_ZONES[0] | typeof RESOURCE_MARKERS[0];
}

export function RealMap({ onNavigate }: Props) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
    const [showLayers, setShowLayers] = useState({ hazards: true, resources: true });
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

    const userLocation: [number, number] = [-122.4194, 37.7749];

    // Fetch route to nearest shelter
    useEffect(() => {
        const fetchRoute = async () => {
            try {
                const url = `https://router.project-osrm.org/route/v1/foot/${userLocation[0]},${userLocation[1]};${RESOURCE_MARKERS[0].coordinates[0]},${RESOURCE_MARKERS[0].coordinates[1]}?overview=full&geometries=geojson`;
                const response = await fetch(url);
                const data = await response.json();
                if (data.routes?.[0]) {
                    setRouteCoords(data.routes[0].geometry.coordinates);
                }
            } catch (error) {
                console.error('Route fetch failed:', error);
            }
        };
        fetchRoute();
    }, []);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: userLocation,
            zoom: 13.5,
            attributionControl: false,
        });

        const mapInstance = map.current;

        mapInstance.on('load', () => {
            // Add hazard zones
            HAZARD_ZONES.forEach(zone => {
                mapInstance.addSource(zone.id, {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: { id: zone.id },
                        geometry: { type: 'Polygon', coordinates: [zone.coordinates] }
                    }
                });

                mapInstance.addLayer({
                    id: `${zone.id}-fill`,
                    type: 'fill',
                    source: zone.id,
                    paint: { 'fill-color': zone.color, 'fill-opacity': 0.25 }
                });

                mapInstance.addLayer({
                    id: `${zone.id}-border`,
                    type: 'line',
                    source: zone.id,
                    paint: { 'line-color': zone.color, 'line-width': 2, 'line-dasharray': [2, 2] }
                });
            });

            // Add route
            mapInstance.addSource('route', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeCoords.length ? routeCoords : [userLocation, RESOURCE_MARKERS[0].coordinates] } }
            });

            mapInstance.addLayer({
                id: 'route-glow',
                type: 'line',
                source: 'route',
                paint: { 'line-color': '#22c55e', 'line-width': 8, 'line-opacity': 0.4, 'line-blur': 3 }
            });

            mapInstance.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                paint: { 'line-color': '#22c55e', 'line-width': 4 },
                layout: { 'line-cap': 'round', 'line-join': 'round' }
            });
        });

        // User marker
        const userEl = document.createElement('div');
        userEl.innerHTML = `
            <div style="position:relative;">
                <div style="width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,0.5);"></div>
                <div style="position:absolute;inset:-6px;border:2px solid #3b82f6;border-radius:50%;animation:pulse 2s infinite;opacity:0.5;"></div>
            </div>
        `;
        new maplibregl.Marker({ element: userEl }).setLngLat(userLocation).addTo(mapInstance);

        // Hazard markers
        HAZARD_ZONES.forEach(zone => {
            const el = document.createElement('div');
            el.className = 'hazard-marker';
            el.innerHTML = `
                <div style="width:36px;height:36px;background:${zone.color};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px ${zone.color}80;cursor:pointer;animation:hazardPulse 1.5s infinite;">
                    <span style="font-size:18px;">${zone.icon}</span>
                </div>
            `;
            el.onclick = () => setSelectedItem({ type: 'hazard', data: zone });
            const marker = new maplibregl.Marker({ element: el }).setLngLat(zone.center).addTo(mapInstance);
            markersRef.current.push(marker);
        });

        // Resource markers
        RESOURCE_MARKERS.forEach(resource => {
            const el = document.createElement('div');
            el.className = 'resource-marker';
            const borderColor = resource.inHazardZone ? '#f97316' : '#22c55e';
            el.innerHTML = `
                <div style="width:32px;height:32px;background:#1c1c1e;border:2px solid ${borderColor};border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;">
                    <span style="font-size:16px;">${resource.icon}</span>
                </div>
            `;
            el.onclick = () => setSelectedItem({ type: 'resource', data: resource });
            const marker = new maplibregl.Marker({ element: el }).setLngLat(resource.coordinates).addTo(mapInstance);
            markersRef.current.push(marker);
        });

        return () => {
            mapInstance.remove();
            map.current = null;
            markersRef.current = [];
        };
    }, []);

    // Update route when coords load
    useEffect(() => {
        if (!map.current || routeCoords.length < 2) return;
        const source = map.current.getSource('route') as maplibregl.GeoJSONSource;
        if (source) {
            source.setData({
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: routeCoords }
            });
        }
    }, [routeCoords]);

    // Toggle layer visibility
    useEffect(() => {
        if (!map.current) return;
        HAZARD_ZONES.forEach(zone => {
            const visibility = showLayers.hazards ? 'visible' : 'none';
            if (map.current?.getLayer(`${zone.id}-fill`)) {
                map.current.setLayoutProperty(`${zone.id}-fill`, 'visibility', visibility);
                map.current.setLayoutProperty(`${zone.id}-border`, 'visibility', visibility);
            }
        });
        // Toggle marker visibility
        document.querySelectorAll('.hazard-marker').forEach(el => {
            (el as HTMLElement).style.display = showLayers.hazards ? 'block' : 'none';
        });
        document.querySelectorAll('.resource-marker').forEach(el => {
            (el as HTMLElement).style.display = showLayers.resources ? 'block' : 'none';
        });
    }, [showLayers]);

    const handleNavigateToResource = (resource: typeof RESOURCE_MARKERS[0]) => {
        if (onNavigate) {
            onNavigate({
                coordinates: resource.coordinates,
                name: resource.name,
                icon: resource.icon
            });
        }
        setSelectedItem(null);
    };

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="w-full h-full" />

            {/* Layer Toggle */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
                <button
                    onClick={() => setShowLayers(s => ({ ...s, hazards: !s.hazards }))}
                    className={clsx(
                        "p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all",
                        showLayers.hazards ? "bg-red-500/80 text-white" : "bg-black/50 text-gray-400"
                    )}
                >
                    <AlertTriangle size={12} />
                </button>
                <button
                    onClick={() => setShowLayers(s => ({ ...s, resources: !s.resources }))}
                    className={clsx(
                        "p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all",
                        showLayers.resources ? "bg-green-500/80 text-white" : "bg-black/50 text-gray-400"
                    )}
                >
                    <Layers size={12} />
                </button>
            </div>

            {/* Selected Item Info Card */}
            {selectedItem && (
                <div className="absolute bottom-12 left-2 right-2 bg-[#1c1c1e]/95 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-xl animate-slideUp">
                    <div className="p-3">
                        <div className="flex items-start gap-3">
                            <div className={clsx(
                                "w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0",
                                selectedItem.type === 'hazard' ? "bg-red-500/20" : "bg-white/10"
                            )}>
                                {selectedItem.type === 'hazard'
                                    ? (selectedItem.data as typeof HAZARD_ZONES[0]).icon
                                    : (selectedItem.data as typeof RESOURCE_MARKERS[0]).icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-white font-semibold text-sm truncate">
                                        {selectedItem.data.name}
                                    </p>
                                    {selectedItem.type === 'hazard' ? (
                                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded">
                                            {(selectedItem.data as typeof HAZARD_ZONES[0]).severity.toUpperCase()}
                                        </span>
                                    ) : (
                                        <span className={clsx(
                                            "px-1.5 py-0.5 text-[10px] font-bold rounded",
                                            (selectedItem.data as typeof RESOURCE_MARKERS[0]).inHazardZone
                                                ? "bg-orange-500/20 text-orange-400"
                                                : "bg-green-500/20 text-green-400"
                                        )}>
                                            {(selectedItem.data as typeof RESOURCE_MARKERS[0]).inHazardZone ? '⚠️ HAZARD' : '✓ SAFE'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-400 text-xs mt-0.5">
                                    {selectedItem.type === 'hazard'
                                        ? (selectedItem.data as typeof HAZARD_ZONES[0]).description
                                        : (selectedItem.data as typeof RESOURCE_MARKERS[0]).capacity}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="p-1 hover:bg-white/10 rounded-full"
                            >
                                <X size={14} className="text-gray-500" />
                            </button>
                        </div>

                        {selectedItem.type === 'resource' && (
                            <div className="flex gap-2 mt-3">
                                <div className="flex-1 flex items-center gap-1.5 text-xs text-gray-400">
                                    <Clock size={12} />
                                    <span>{(selectedItem.data as typeof RESOURCE_MARKERS[0]).hours}</span>
                                </div>
                                <button
                                    onClick={() => window.open(`tel:${(selectedItem.data as typeof RESOURCE_MARKERS[0]).phone}`, '_self')}
                                    className="px-2.5 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium flex items-center gap-1"
                                >
                                    <Phone size={12} />
                                    Call
                                </button>
                                <button
                                    onClick={() => handleNavigateToResource(selectedItem.data as typeof RESOURCE_MARKERS[0])}
                                    className="px-2.5 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                                >
                                    <Navigation size={12} />
                                    Go
                                </button>
                            </div>
                        )}

                        {selectedItem.type === 'hazard' && (
                            <div className="flex items-center gap-2 mt-3 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                                <Shield size={14} className="text-red-400" />
                                <p className="text-red-300 text-xs">Avoid this area - Follow evacuation routes</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Navigate Button */}
            <button
                onClick={() => onNavigate?.()}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-2"
            >
                🧭 Navigate to Safety
            </button>

            <style>{`
                @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.5); opacity: 0; } }
                @keyframes hazardPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
                @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-slideUp { animation: slideUp 0.2s ease-out; }
            `}</style>
        </div>
    );
}
