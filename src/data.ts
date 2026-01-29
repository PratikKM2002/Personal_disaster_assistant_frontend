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

// User Profile Types
export interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    location: Location;
    bloodType?: string;
    medicalConditions?: string[];
    allergies?: string[];
    emergencyContacts: EmergencyContact[];
}

export interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relationship: string;
    isPrimary: boolean;
}

// Family Status Types
export interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    phone: string;
    status: 'safe' | 'danger' | 'pending' | 'unknown';
    lastUpdate: Date;
    location?: Location;
}

// Community Types
export interface Neighbor {
    id: string;
    name: string;
    distance: string;
    apartment?: string;
    status: 'safe' | 'needs-help' | 'unknown' | 'offering-help';
    lastUpdate: string;
    specialNeeds?: string;
    canOffer?: string[];
    needs?: string[];
}

export interface SharedResource {
    id: string;
    type: 'offering' | 'requesting';
    category: 'water' | 'food' | 'shelter' | 'transport' | 'medical' | 'supplies';
    title: string;
    description: string;
    postedBy: string;
    distance: string;
    quantity?: string;
    claimed?: boolean;
    createdAt: Date;
}

// Emergency Kit Types
export interface KitItem {
    id: string;
    name: string;
    category: string;
    checked: boolean;
    quantity: number;
    expirationDate?: string;
}

export interface KitCategory {
    id: string;
    name: string;
    icon: string;
    items: KitItem[];
}

// Alert Types
export interface Alert {
    id: string;
    type: 'critical' | 'warning' | 'advisory' | 'info';
    title: string;
    description: string;
    action: string;
    timestamp: Date;
    expiresAt?: Date;
}

// Mock User
export const MOCK_USER: UserProfile = {
    id: 'u1',
    name: 'Pratik',
    email: 'pratik@example.com',
    phone: '+1 (555) 123-4567',
    location: MOCK_USER_LOCATION,
    bloodType: 'O+',
    medicalConditions: [],
    allergies: [],
    emergencyContacts: [
        { id: 'ec1', name: 'Sarah Johnson', phone: '+1 (555) 123-4567', relationship: 'Spouse', isPrimary: true },
        { id: 'ec2', name: 'Michael Chen', phone: '+1 (555) 987-6543', relationship: 'Brother', isPrimary: false },
    ]
};
