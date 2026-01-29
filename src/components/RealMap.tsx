import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
    onNavigate?: () => void;
}

const START: [number, number] = [-122.4194, 37.7749];
const END: [number, number] = [-122.4100, 37.7810];

export function RealMap({ onNavigate }: Props) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

    // Fetch real route from OSRM
    useEffect(() => {
        const fetchRoute = async () => {
            try {
                const url = `https://router.project-osrm.org/route/v1/foot/${START[0]},${START[1]};${END[0]},${END[1]}?overview=full&geometries=geojson`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.routes && data.routes[0]) {
                    setRouteCoords(data.routes[0].geometry.coordinates);
                }
            } catch (error) {
                console.error('Failed to fetch route:', error);
                // Fallback to simple line
                setRouteCoords([START, END]);
            }
        };

        fetchRoute();
    }, []);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: START,
            zoom: 14,
            attributionControl: false,
        });

        const mapInstance = map.current;

        mapInstance.on('load', () => {
            // Hazard zone
            mapInstance.addSource('hazard-zone', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [-122.425, 37.782],
                            [-122.415, 37.782],
                            [-122.415, 37.772],
                            [-122.425, 37.772],
                            [-122.425, 37.782],
                        ]]
                    }
                }
            });

            mapInstance.addLayer({
                id: 'hazard-fill',
                type: 'fill',
                source: 'hazard-zone',
                paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.3 }
            });

            mapInstance.addLayer({
                id: 'hazard-border',
                type: 'line',
                source: 'hazard-zone',
                paint: { 'line-color': '#ef4444', 'line-width': 2 }
            });

            // Route source (will be updated when routeCoords loads)
            mapInstance.addSource('route', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeCoords.length ? routeCoords : [START, END] } }
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
        userEl.innerHTML = '<div style="width:14px;height:14px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>';
        new maplibregl.Marker({ element: userEl }).setLngLat(START).addTo(mapInstance);

        // Shelter marker
        const shelterEl = document.createElement('div');
        shelterEl.innerHTML = '<div style="background:#1d4ed8;padding:4px 8px;border-radius:6px;font-size:11px;color:white;font-weight:600;">🏠 Shelter</div>';
        new maplibregl.Marker({ element: shelterEl }).setLngLat(END).addTo(mapInstance);

        return () => {
            mapInstance.remove();
            map.current = null;
        };
    }, []);

    // Update route when coordinates are fetched
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

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="w-full h-full" />

            <button
                onClick={onNavigate}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg flex items-center gap-2"
            >
                🧭 Navigate to Safety
            </button>
        </div>
    );
}
