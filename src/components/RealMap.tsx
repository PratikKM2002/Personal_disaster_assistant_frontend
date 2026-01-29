import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ZoomIn, ZoomOut, Locate, Layers, Navigation, Maximize2 } from 'lucide-react';

interface Props {
    className?: string;
    onNavigate?: () => void;
}

export function RealMap({ className, onNavigate }: Props) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showLegend, setShowLegend] = useState(true);

    // San Francisco coordinates
    const userLocation: [number, number] = [-122.4194, 37.7649];
    const shelterLocation: [number, number] = [-122.4100, 37.7780];
    const hospitalLocation: [number, number] = [-122.405, 37.7550];
    const fireStationLocation: [number, number] = [-122.4250, 37.7700];
    const waterDistLocation: [number, number] = [-122.4120, 37.7620];

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: [-122.4150, 37.7700],
            zoom: 13.5,
            attributionControl: false,
            pitch: 0,
        });

        const mapInstance = map.current;

        mapInstance.on('load', () => {
            // Add hazard zone polygon
            mapInstance.addSource('hazard-zone', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [-122.428, 37.784],
                            [-122.412, 37.784],
                            [-122.412, 37.772],
                            [-122.428, 37.772],
                            [-122.428, 37.784],
                        ]]
                    }
                }
            });

            mapInstance.addLayer({
                id: 'hazard-zone-fill',
                type: 'fill',
                source: 'hazard-zone',
                paint: {
                    'fill-color': '#ef4444',
                    'fill-opacity': 0.25
                }
            });

            mapInstance.addLayer({
                id: 'hazard-zone-border',
                type: 'line',
                source: 'hazard-zone',
                paint: {
                    'line-color': '#ef4444',
                    'line-width': 3,
                    'line-dasharray': [4, 3]
                }
            });

            // Add safe zone
            mapInstance.addSource('safe-zone', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [-122.415, 37.770],
                            [-122.400, 37.770],
                            [-122.400, 37.755],
                            [-122.415, 37.755],
                            [-122.415, 37.770],
                        ]]
                    }
                }
            });

            mapInstance.addLayer({
                id: 'safe-zone-fill',
                type: 'fill',
                source: 'safe-zone',
                paint: {
                    'fill-color': '#22c55e',
                    'fill-opacity': 0.15
                }
            });

            mapInstance.addLayer({
                id: 'safe-zone-border',
                type: 'line',
                source: 'safe-zone',
                paint: {
                    'line-color': '#22c55e',
                    'line-width': 2,
                }
            });

            // Add evacuation route
            mapInstance.addSource('evacuation-route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            userLocation,
                            [-122.4180, 37.7680],
                            [-122.4150, 37.7720],
                            [-122.4120, 37.7760],
                            shelterLocation,
                        ]
                    }
                }
            });

            // Route glow effect
            mapInstance.addLayer({
                id: 'evacuation-route-glow',
                type: 'line',
                source: 'evacuation-route',
                paint: {
                    'line-color': '#22c55e',
                    'line-width': 12,
                    'line-opacity': 0.3,
                    'line-blur': 4
                }
            });

            mapInstance.addLayer({
                id: 'evacuation-route-line',
                type: 'line',
                source: 'evacuation-route',
                paint: {
                    'line-color': '#22c55e',
                    'line-width': 4,
                    'line-opacity': 1
                },
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round'
                }
            });
        });

        // User location marker with pulse
        const userEl = document.createElement('div');
        userEl.innerHTML = `
            <div style="position: relative; cursor: pointer;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: rgba(59, 130, 246, 0.2); border-radius: 50%; animation: pulse 2s infinite;"></div>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: pulse 2s infinite 0.5s;"></div>
                <div style="position: relative; width: 16px; height: 16px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 10px rgba(59, 130, 246, 0.5);"></div>
            </div>
        `;
        new maplibregl.Marker({ element: userEl })
            .setLngLat(userLocation)
            .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<div style="padding: 8px; font-weight: 600;">📍 Your Location</div>'))
            .addTo(mapInstance);

        // Shelter marker
        createMarker(mapInstance, shelterLocation, '🏠', 'Shelter', 'Moscone Center', '0.8 mi', 'blue');

        // Hospital marker
        createMarker(mapInstance, hospitalLocation, '🏥', 'Hospital', 'SF General', '1.2 mi', 'red');

        // Fire Station marker
        createMarker(mapInstance, fireStationLocation, '🚒', 'Fire Station', 'Station 7', '0.5 mi', 'orange');

        // Water Distribution marker
        createMarker(mapInstance, waterDistLocation, '💧', 'Water Point', 'Distribution', '0.3 mi', 'cyan');

        // Hazard zone label
        const hazardEl = document.createElement('div');
        hazardEl.innerHTML = `
            <div style="background: rgba(220, 38, 38, 0.9); padding: 6px 14px; border-radius: 20px; border: 2px solid #ef4444; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);">
                <span style="font-size: 12px; color: white; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">⚠️ Hazard Zone</span>
            </div>
        `;
        new maplibregl.Marker({ element: hazardEl })
            .setLngLat([-122.420, 37.778])
            .addTo(mapInstance);

        // Safe zone label
        const safeEl = document.createElement('div');
        safeEl.innerHTML = `
            <div style="background: rgba(34, 197, 94, 0.9); padding: 6px 14px; border-radius: 20px; border: 2px solid #22c55e; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);">
                <span style="font-size: 12px; color: white; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">✓ Safe Zone</span>
            </div>
        `;
        new maplibregl.Marker({ element: safeEl })
            .setLngLat([-122.407, 37.762])
            .addTo(mapInstance);

        return () => {
            mapInstance.remove();
            map.current = null;
        };
    }, []);

    const handleZoomIn = () => map.current?.zoomIn();
    const handleZoomOut = () => map.current?.zoomOut();
    const handleLocate = () => map.current?.flyTo({ center: userLocation, zoom: 15 });
    const handleFitBounds = () => {
        map.current?.fitBounds([
            [-122.430, 37.750],
            [-122.395, 37.790]
        ], { padding: 40 });
    };

    return (
        <div className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

            {/* Map Controls */}
            <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                <button onClick={handleZoomIn} className="w-8 h-8 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/90 transition-colors border border-white/10">
                    <ZoomIn size={16} className="text-white" />
                </button>
                <button onClick={handleZoomOut} className="w-8 h-8 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/90 transition-colors border border-white/10">
                    <ZoomOut size={16} className="text-white" />
                </button>
                <button onClick={handleLocate} className="w-8 h-8 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/90 transition-colors border border-white/10">
                    <Locate size={16} className="text-white" />
                </button>
                <button onClick={handleFitBounds} className="w-8 h-8 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/90 transition-colors border border-white/10">
                    <Maximize2 size={16} className="text-white" />
                </button>
                <button onClick={() => setShowLegend(!showLegend)} className="w-8 h-8 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/90 transition-colors border border-white/10">
                    <Layers size={16} className="text-white" />
                </button>
            </div>

            {/* Legend */}
            {showLegend && (
                <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-2">Legend</p>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500/40 border border-red-500 rounded-sm" />
                            <span className="text-[10px] text-white">Hazard Zone</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500/40 border border-green-500 rounded-sm" />
                            <span className="text-[10px] text-white">Safe Zone</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-green-500 rounded" />
                            <span className="text-[10px] text-white">Evacuation Route</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full border border-white" />
                            <span className="text-[10px] text-white">Your Location</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Distance Card */}
            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-green-500/30">
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">To Safety</p>
                <p className="text-lg font-bold text-green-400">0.8 mi</p>
                <p className="text-[10px] text-gray-500">~12 min walk</p>
            </div>

            {/* Navigation Button */}
            <button
                onClick={onNavigate}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-green-500/30 transition-all"
            >
                <Navigation size={16} className="text-white" />
                <span className="text-sm font-bold text-white">Start Navigation</span>
            </button>

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                }
                .maplibregl-popup-content {
                    background: #1a1a1a !important;
                    color: white !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                }
                .maplibregl-popup-tip {
                    border-top-color: #1a1a1a !important;
                }
            `}</style>
        </div>
    );
}

function createMarker(
    map: maplibregl.Map,
    coords: [number, number],
    emoji: string,
    type: string,
    name: string,
    distance: string,
    color: 'blue' | 'red' | 'orange' | 'cyan'
) {
    const colors = {
        blue: { bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'rgba(59, 130, 246, 0.3)' },
        red: { bg: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: 'rgba(239, 68, 68, 0.3)' },
        orange: { bg: 'linear-gradient(135deg, #f97316, #c2410c)', border: 'rgba(249, 115, 22, 0.3)' },
        cyan: { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'rgba(6, 182, 212, 0.3)' },
    };

    const el = document.createElement('div');
    el.innerHTML = `
        <div style="background: ${colors[color].bg}; padding: 8px 12px; border-radius: 10px; display: flex; align-items: center; gap: 8px; border: 1px solid ${colors[color].border}; box-shadow: 0 4px 15px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <span style="font-size: 18px;">${emoji}</span>
            <div>
                <div style="font-size: 9px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px;">${type}</div>
                <div style="font-size: 12px; color: white; font-weight: 600;">${name}</div>
                <div style="font-size: 10px; color: rgba(255,255,255,0.6);">${distance}</div>
            </div>
        </div>
    `;
    new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);
}
