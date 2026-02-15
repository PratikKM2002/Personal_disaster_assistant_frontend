// Type definitions for Guardian AI

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

export interface FamilyMember {
    id: string;
    name: string;
    relationship?: string;
    phone: string;
    status: 'safe' | 'danger' | 'pending' | 'unknown';
    lastUpdate: string;
    location?: string;
    coordinates?: [number, number];
    batteryLevel?: number;
    isOnline?: boolean;
}

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
    phone?: string;
}

export interface SharedResource {
    id: string;
    type: 'offering' | 'requesting';
    category: 'water' | 'food' | 'shelter' | 'transport' | 'medical' | 'supplies';
    title: string;
    description: string;
    postedBy: string;
    distance: string;
    timeAgo?: string;
    quantity?: string;
    claimed?: boolean;
    createdAt?: Date;
    capacity?: number;
    lastUpdated?: Date;
    resourceType?: string; // Added this as 'resourceType' to avoid conflict with existing 'type'
}

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
    color: string;
    items: KitItem[];
}

export interface Alert {
    id: string;
    type: 'critical' | 'warning' | 'advisory' | 'info';
    title: string;
    description: string;
    action?: string;
    location?: string;
    category?: string;
    timestamp: Date;
    expiresAt?: Date;
    isRead?: boolean;
    actionLabel?: string;
    actionIcon?: string;
    actionDestination?: NavigationDestination;
}

export interface NavigationDestination {
    coordinates: [number, number];
    name: string;
    icon?: string;
}

export interface Resource {
    id: string;
    name: string;
    type: string;
    category: 'medical' | 'shelter' | 'emergency' | 'supplies';
    distance: string;
    address: string;
    phone?: string;
    hours?: string;
    status: 'open' | 'limited' | 'closed';
    capacity?: string;
    icon: string;
    coordinates: [number, number];
    inHazardZone: boolean;
    hazardWarning?: string;
}

export interface ChatMessage {
    id: string;
    type: 'user' | 'bot';
    content: string;
    timestamp: Date;
    isTyping?: boolean;
}

export interface GroupMessage {
    id: string;
    text: string;
    timestamp: Date;
    sender?: string;
    recipients?: string[];
    status: 'sent' | 'delivered' | 'read';
    isIncoming?: boolean;
}
