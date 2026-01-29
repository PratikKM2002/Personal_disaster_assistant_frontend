export type HazardType = 'wildfire' | 'flood' | 'earthquake';

export interface Location {
    lat: number;
    lng: number;
}

export interface Hazard {
    id: string;
    type: HazardType;
    title: string;
    severity: 'critical' | 'high' | 'moderate';
    location: Location;
    zone: string;
    description: string;
    action: string;
    evacuationRoute: Location[];
    shelters: { name: string; location: Location; type: 'shelter' | 'hospital' }[];
}

export const DUMMY_HAZARDS: Hazard[] = [
    {
        id: 'h1',
        type: 'wildfire',
        title: 'Wildfire Spreading (Mission District)',
        severity: 'critical',
        zone: 'Zone B',
        location: { lat: 37.76, lng: -122.42 },
        description: 'Wildfire rapidly approaching residential areas. High wind speeds aiding spread.',
        action: 'Evacuate Zone B IMMEDIATELY',
        evacuationRoute: [
            { lat: 37.76, lng: -122.42 },
            { lat: 37.765, lng: -122.415 },
            { lat: 37.77, lng: -122.41 },
            { lat: 37.78, lng: -122.40 } // Moscone Center
        ],
        shelters: [
            { name: 'Moscone Center Shelter', location: { lat: 37.78, lng: -122.40 }, type: 'shelter' },
            { name: 'SF General Hospital', location: { lat: 37.756, lng: -122.405 }, type: 'hospital' }
        ]
    },
    {
        id: 'h2',
        type: 'flood',
        title: 'Flash Flood Warning (Low-lying Areas)',
        severity: 'high',
        zone: 'Zone A',
        location: { lat: 37.75, lng: -122.41 },
        description: 'Heavy rainfall causing rapid water rise in low-lying intersections.',
        action: 'Move to higher ground. Avoid underpasses.',
        evacuationRoute: [
            { lat: 37.75, lng: -122.41 },
            { lat: 37.755, lng: -122.43 }, // Twin Peaks area (higher ground)
        ],
        shelters: [
            { name: 'Twin Peaks Community Center', location: { lat: 37.755, lng: -122.44 }, type: 'shelter' }
        ]
    },
    {
        id: 'h3',
        type: 'earthquake',
        title: 'Seismic Alert (Magnitude 5.2)',
        severity: 'moderate',
        zone: 'Citywide',
        location: { lat: 37.7749, lng: -122.4194 },
        description: 'Moderate earthquake detected. Aftershocks possible.',
        action: 'Drop, Cover, and Hold On.',
        evacuationRoute: [], // Stay put during quake
        shelters: []
    }
];

export const MOCK_USER_LOCATION = { lat: 37.765, lng: -122.42 };
