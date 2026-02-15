// Mock data for Guardian AI
import { Alert, FamilyMember, Hazard, KitCategory, Neighbor, Resource, SharedResource, UserProfile } from '../types';

// User location (San Francisco)
export const MOCK_USER_LOCATION = { lat: 37.765, lng: -122.42 };

// Mock User Profile
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

// Hazard Zones - Removed (Fetching from Backend)
export const DUMMY_HAZARDS: Hazard[] = [];

// Family Members - Removed (Fetching from Backend)
export const MOCK_FAMILY: FamilyMember[] = [];

// Neighbors
export const MOCK_NEIGHBORS: Neighbor[] = [
    {
        id: '1',
        name: 'Sarah K.',
        distance: '50 ft',
        status: 'safe',
        lastUpdate: '5 min ago',
        apartment: 'Apt 18',
        canOffer: ['First Aid', 'Water'],
        phone: '+1 (555) 123-4567'
    },
    {
        id: '2',
        name: 'Robert M.',
        distance: '100 ft',
        status: 'needs-help',
        lastUpdate: '2 min ago',
        apartment: 'Apt 24',
        specialNeeds: 'Wheelchair user',
        needs: ['Transport', 'Medication'],
        phone: '+1 (555) 234-5678'
    },
    {
        id: '3',
        name: 'Maria G.',
        distance: '150 ft',
        status: 'offering-help',
        lastUpdate: '10 min ago',
        apartment: 'Apt 8',
        canOffer: ['Transport', 'Shelter'],
        phone: '+1 (555) 345-6789'
    },
    {
        id: '4',
        name: 'James L.',
        distance: '200 ft',
        status: 'unknown',
        lastUpdate: '1 hour ago',
        apartment: 'Apt 31',
        phone: '+1 (555) 456-7890'
    },
    {
        id: '5',
        name: 'Lin W.',
        distance: '75 ft',
        status: 'safe',
        lastUpdate: '15 min ago',
        apartment: 'Apt 12',
        canOffer: ['Food', 'Pet care'],
        phone: '+1 (555) 567-8901'
    },
];

// Alerts - Removed (Fetching from Backend)
export const MOCK_ALERTS: Alert[] = [];

// Nearby Resources - Removed (Fetching from Backend)
export const MOCK_RESOURCES: Resource[] = [];

// Shared Resources
export const MOCK_SHARED_RESOURCES: SharedResource[] = [
    {
        id: '1',
        type: 'offering',
        category: 'water',
        title: 'Bottled Water - 24 Pack',
        description: 'Sealed case of bottled water. Can deliver within 2 blocks.',
        postedBy: 'Mike R.',
        distance: '0.1 mi',
        timeAgo: '5 min ago',
        quantity: '24 bottles',
    },
    {
        id: '2',
        type: 'offering',
        category: 'transport',
        title: 'Car Available for Evacuation',
        description: 'SUV with room for 4 people + luggage. Heading to Oakland.',
        postedBy: 'Lisa T.',
        distance: '0.2 mi',
        timeAgo: '15 min ago',
        quantity: '4 seats',
    },
    {
        id: '3',
        type: 'requesting',
        category: 'medical',
        title: 'Need Insulin - Urgent',
        description: 'Type 1 diabetic, running low on insulin. Any help appreciated.',
        postedBy: 'David K.',
        distance: '0.3 mi',
        timeAgo: '20 min ago',
    },
];

// Emergency Kit Categories
export const EMERGENCY_KIT: KitCategory[] = [
    {
        id: 'water',
        name: 'Water & Food',
        icon: '💧',
        color: 'blue',
        items: [
            { id: 'w1', name: 'Water (1 gallon/person/day)', category: 'water', checked: true, quantity: 6 },
            { id: 'w2', name: 'Non-perishable food', category: 'water', checked: true, quantity: 1 },
            { id: 'w3', name: 'Manual can opener', category: 'water', checked: false, quantity: 1 },
        ]
    },
    {
        id: 'medical',
        name: 'First Aid',
        icon: '🏥',
        color: 'red',
        items: [
            { id: 'm1', name: 'First aid kit', category: 'medical', checked: true, quantity: 1 },
            { id: 'm2', name: 'Prescription medications', category: 'medical', checked: true, quantity: 1 },
            { id: 'm3', name: 'N95 Masks', category: 'medical', checked: false, quantity: 10 },
        ]
    },
    {
        id: 'documents',
        name: 'Documents',
        icon: '📄',
        color: 'orange',
        items: [
            { id: 'd1', name: 'ID copies', category: 'documents', checked: true, quantity: 1 },
            { id: 'd2', name: 'Insurance documents', category: 'documents', checked: false, quantity: 1 },
            { id: 'd3', name: 'Cash/cards', category: 'documents', checked: true, quantity: 1 },
        ]
    },
    {
        id: 'tools',
        name: 'Tools & Supplies',
        icon: '🔧',
        color: 'gray',
        items: [
            { id: 't1', name: 'Flashlight', category: 'tools', checked: true, quantity: 2 },
            { id: 't2', name: 'Extra batteries', category: 'tools', checked: false, quantity: 8 },
            { id: 't3', name: 'Phone charger/power bank', category: 'tools', checked: true, quantity: 1 },
        ]
    },
];

// Quick Actions for Chatbot
export const QUICK_ACTIONS = [
    { icon: '📍', label: 'Find shelter', query: 'Where is the nearest shelter?' },
    { icon: '⚠️', label: 'Current alerts', query: 'What are the current alerts in my area?' },
    { icon: '📦', label: 'Emergency kit', query: 'What should I pack in my emergency kit?' },
    { icon: '📞', label: 'Emergency numbers', query: 'What are the important emergency numbers?' },
];

// Bot Responses
export const BOT_RESPONSES: Record<string, string> = {
    'shelter': '🏢 The nearest shelter is Moscone Center (1.2 mi away). It currently has capacity for 50 more people. Would you like me to navigate you there?',
    'alert': '⚠️ There are 3 active alerts in your area:\n\n1. 🔥 CRITICAL: Wildfire in Mission District\n2. 💨 WARNING: Poor air quality (AQI 180)\n3. 🚧 ADVISORY: Road closure on Hwy 101',
    'kit': '📦 Essential emergency kit items:\n\n• Water (1 gallon/person/day)\n• Non-perishable food (3 days)\n• First aid supplies\n• Flashlight & batteries\n• Phone charger\n• Important documents\n• Medications',
    'emergency': '📞 Emergency Numbers:\n\n• 911 - Police/Fire/Medical\n• (415) 206-8111 - SF General Hospital\n• (800) 733-2767 - Red Cross\n• 311 - Non-emergency city services',
    'default': "I'm Guardian AI, your disaster preparedness assistant. I can help you with:\n\n• Finding nearby shelters\n• Current emergency alerts\n• Emergency kit checklists\n• Emergency contact info\n\nHow can I assist you today?"
};
