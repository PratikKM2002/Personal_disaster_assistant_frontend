import { useState, useEffect, useRef } from 'react';
import { X, Volume2, ChevronUp } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Destination {
    coordinates: [number, number];
    name: string;
    icon?: string;
}

interface Props {
    isActive: boolean;
    onClose: () => void;
    destination?: Destination;
}

const getSteps = (destName: string) => [
    { icon: "↗", direction: "Head northeast", street: "Mission St", dist: "0.2 mi", meters: "350 m" },
    { icon: "→", direction: "Turn right", street: "3rd St", dist: "0.3 mi", meters: "500 m" },
    { icon: "↑", direction: "Continue straight", street: "Howard St", dist: "0.2 mi", meters: "300 m" },
    { icon: "📍", direction: "Arrive at", street: destName, dist: "", meters: "" },
];

// Default start and end points
const DEFAULT_START: [number, number] = [-122.4194, 37.7649];
const DEFAULT_END: [number, number] = [-122.4100, 37.7810];

export function NavigationPanel({ isActive, onClose, destination }: Props) {
    const [step, setStep] = useState(0);
    const [showSteps, setShowSteps] = useState(false);

    // Use provided destination or default
    const START = DEFAULT_START;
    const END = destination?.coordinates || DEFAULT_END;
    const destName = destination?.name || 'Moscone Center';
    const destIcon = destination?.icon || '🏠';
    const STEPS = getSteps(destName);

    const [routeCoords, setRouteCoords] = useState<[number, number][]>([START, END]);
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const userMarker = useRef<maplibregl.Marker | null>(null);

    // Fetch real route from OSRM
    useEffect(() => {
        if (!isActive) return;

        const fetchRoute = async () => {
            try {
                const url = `https://router.project-osrm.org/route/v1/foot/${START[0]},${START[1]};${END[0]},${END[1]}?overview=full&geometries=geojson`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.routes && data.routes[0]) {
                    const coords = data.routes[0].geometry.coordinates as [number, number][];
                    setRouteCoords(coords);
                }
            } catch (error) {
                console.error('Failed to fetch route:', error);
            }
        };

        fetchRoute();
    }, [isActive, END[0], END[1]]);

    // Auto-advance steps
    useEffect(() => {
        if (!isActive) {
            setStep(0);
            setShowSteps(false);
            return;
        }

        // Reset step to 0 when navigation starts
        setStep(0);

        const interval = setInterval(() => {
            setStep(s => s < STEPS.length - 1 ? s + 1 : s);
        }, 8000); // Slower interval for better demo
        return () => clearInterval(interval);
    }, [isActive, destName]); // Re-run when destination changes

    // Initialize map
    useEffect(() => {
        if (!isActive || !mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: START,
            zoom: 15,
            attributionControl: false,
            pitch: 60,
            bearing: 30,
        });

        const mapInstance = map.current;

        mapInstance.on('load', () => {
            mapInstance.addSource('route', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeCoords } }
            });

            mapInstance.addLayer({
                id: 'route-glow', type: 'line', source: 'route',
                paint: { 'line-color': '#4285F4', 'line-width': 14, 'line-opacity': 0.4, 'line-blur': 6 }
            });

            mapInstance.addLayer({
                id: 'route-line', type: 'line', source: 'route',
                paint: { 'line-color': '#4285F4', 'line-width': 6 },
                layout: { 'line-cap': 'round', 'line-join': 'round' }
            });
        });

        const userEl = document.createElement('div');
        userEl.innerHTML = `
            <div style="width:24px;height:24px;position:relative;">
                <div style="position:absolute;inset:0;background:#4285F4;border-radius:50%;animation:navPulse 2s infinite;"></div>
                <div style="position:absolute;inset:4px;background:#4285F4;border:3px solid white;border-radius:50%;box-shadow:0 2px 12px rgba(66,133,244,0.6);"></div>
                <div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid #4285F4;"></div>
            </div>
        `;
        userMarker.current = new maplibregl.Marker({ element: userEl }).setLngLat(START).addTo(mapInstance);

        const destEl = document.createElement('div');
        destEl.innerHTML = `<div style="width:32px;height:32px;background:#34A853;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);"><span style="font-size:16px;">${destIcon}</span></div>`;
        new maplibregl.Marker({ element: destEl }).setLngLat(END).addTo(mapInstance);

        return () => { mapInstance.remove(); map.current = null; userMarker.current = null; };
    }, [isActive]);

    // Update route on map when routeCoords change
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

    // Animate user along route
    useEffect(() => {
        if (!map.current || !userMarker.current || !isActive || routeCoords.length < 2) return;

        const progress = step / (STEPS.length - 1);
        const index = Math.floor(progress * (routeCoords.length - 1));
        const coord = routeCoords[Math.min(index, routeCoords.length - 1)];

        userMarker.current.setLngLat(coord);
        map.current.flyTo({ center: coord, duration: 1500 });
    }, [step, isActive, routeCoords]);

    if (!isActive) return null;

    const current = STEPS[step];
    const distRemaining = Math.max(0, 0.8 - step * 0.2).toFixed(1);
    const timeRemaining = Math.max(0, 12 - step * 3);

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col overflow-hidden rounded-[40px]">
            <div ref={mapContainer} className="absolute inset-0" />

            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-60 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between p-4">
                <button onClick={onClose} className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center">
                    <X size={20} className="text-white" />
                </button>
                <div className="flex gap-2">
                    <button className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center">
                        <Volume2 size={18} className="text-white" />
                    </button>
                </div>
            </div>

            <div className="absolute top-16 right-4 z-10 bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/20">
                <p className="text-green-400 text-2xl font-bold">{timeRemaining} min</p>
                <p className="text-white/60 text-xs">{distRemaining} mi · Fastest</p>
            </div>

            <div className="absolute bottom-0 inset-x-0 z-10">
                <div className="mx-4 mb-4 bg-[#1C1C1E]/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                    <div className="p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-[#34C759] rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-white text-3xl font-bold">{current.icon}</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-white text-2xl font-semibold">{current.direction}</p>
                                <p className="text-white/70 text-lg">{current.street}</p>
                            </div>
                            {current.meters && (
                                <div className="text-right">
                                    <p className="text-white text-xl font-bold">{current.meters}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button onClick={() => setShowSteps(!showSteps)} className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border-t border-white/10">
                        <ChevronUp size={18} className={`text-white/50 transition-transform ${showSteps ? 'rotate-180' : ''}`} />
                        <span className="text-white/50 text-sm">{showSteps ? 'Hide steps' : `${STEPS.length - step - 1} steps remaining`}</span>
                    </button>

                    {showSteps && (
                        <div className="border-t border-white/10 max-h-40 overflow-y-auto">
                            {STEPS.slice(step + 1).map((s, i) => (
                                <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-white/5">
                                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white">{s.icon}</div>
                                    <div className="flex-1"><p className="text-white text-sm">{s.direction} <span className="text-white/50">on {s.street}</span></p></div>
                                    <p className="text-white/50 text-sm">{s.dist}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-4 pb-6">
                    <button onClick={onClose} className="w-full py-4 bg-[#FF3B30] rounded-2xl text-white font-semibold text-lg shadow-lg">
                        End Route
                    </button>
                </div>
            </div>

            <style>{`@keyframes navPulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(2); opacity: 0; } }`}</style>
        </div>
    );
}
