
// For physical device testing, use your machine's LAN IP:
// For physical device testing, use your machine's LAN IP:
const API_BASE_URL = 'http://192.168.1.36:8000';

let authToken: string | null = null;
export function setAuthToken(token: string) {
    authToken = token;
}

// --- HTTP Helpers ---

async function request<T>(
    path: string,
    options: RequestInit = {},
    auth = false
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : 'Bearer dev-token',
        ...(options.headers as Record<string, string>),
    };

    // TODO: If you want to protect backend routes with Clerk tokens,
    // use `useAuth().getToken()` from Clerk and pass it here.

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });

    const data = await res.json();

    if (!res.ok) {
        throw new ApiError(data.error || 'Request failed', res.status);
    }

    return data as T;
}

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

// --- Profile ---

export interface EmergencyContact {
    id: number;
    name: string;
    phone: string;
    relationship: string | null;
    is_primary: boolean;
}

export interface UserProfile {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    blood_type: string | null;
    public_tag: string | null;
    safety_status: string | null;
    contacts: EmergencyContact[];
}

export async function getProfile(): Promise<UserProfile> {
    return request<UserProfile>('/user/me');
}

export async function updateProfile(data: { phone?: string; blood_type?: string }): Promise<{ success: boolean }> {
    return request('/user/profile', { method: 'PUT', body: JSON.stringify(data) });
}

export async function addEmergencyContact(contact: { name: string; phone: string; relationship?: string; is_primary?: boolean }): Promise<EmergencyContact> {
    return request('/user/contacts', { method: 'POST', body: JSON.stringify(contact) });
}

export async function deleteEmergencyContact(id: number): Promise<{ success: boolean }> {
    return request(`/user/contacts/${id}`, { method: 'DELETE' });
}

// --- Hazards ---

export interface BackendHazard {
    id: number;
    type: string;
    severity: number;
    occurred_at: string;
    lat: number;
    lon: number;
    source: string;
    source_event_id: string;
    attributes: Record<string, any>;
    dist_km: number;
    message?: string;
}

export async function getHazards(
    lat: number,
    lon: number,
    radiusKm = 500
): Promise<BackendHazard[]> {
    return request<BackendHazard[]>(
        `/hazards?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`
    );
}

// --- Shelters ---

export interface BackendShelter {
    id: number;
    name: string;
    address: string;
    lat: number;
    lon: number;
    capacity: number | null;
    status: string;
    phone: string | null;
    updated_at: string;
    dist_km: number;
    type: string;
}

export async function getShelters(
    lat: number,
    lon: number,
    radiusKm = 0, // 0 = no radius filter
    limit = 20
): Promise<BackendShelter[]> {
    return request<BackendShelter[]>(
        `/shelters?lat=${lat}&lon=${lon}&radius_km=${radiusKm}&limit=${limit}`
    );
}

export async function getFloodRisk(lat: number, lon: number): Promise<any> {
    return request<any>(`/hazards/flood?lat=${lat}&lon=${lon}`, {}, true);
}

// --- Weather ---

export interface WeatherData {
    temp: number;
    condition_code: number;
    aqi: number;
    params: {
        temp_unit: string;
        aqi_unit: string;
    };
    forecast: {
        date: string;
        max_temp: number;
        min_temp: number;
        rain_prob: number;
        code: number;
    }[];
}

// --- Overview (hazards + shelters combined) ---

export interface OverviewResponse {
    location: { lat: number; lon: number; radius_km: number; city: string | null };
    weather?: WeatherData;
    hazards: BackendHazard[];
    shelters?: {
        items: any[];
        strategy: string;
    };
    stats?: {
        neighbors_safe: number;
        resources_nearby: number;
        family_safe: number;
        family_total: number;
        preparedness_score: number;
    };
}

export async function getOverview(
    lat: number,
    lon: number,
    radiusKm = 300,
    city?: string
): Promise<OverviewResponse> {
    let url = `/overview?lat=${lat}&lon=${lon}&radius_km=${radiusKm}&limit=100`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    return request<OverviewResponse>(url);
}

// --- Alerts ---

export interface BackendAlert {
    id: number;
    hazard_id: number;
    message: string;
    channel: string;
    created_at: string;
    hazard_lat?: number;
    hazard_lon?: number;
    hazard_type?: string;
    hazard_severity?: number;
    hazard_title?: string;
}

export async function getAlerts(lat?: number, lon?: number, radiusKm = 500): Promise<BackendAlert[]> {
    let url = '/alerts';
    if (lat !== undefined && lon !== undefined) {
        url += `?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`;
    }
    return request<BackendAlert[]>(url, {}, true);
}

// --- Places ---

export interface BackendPlace {
    id: number;
    label: string;
    lat: number;
    lon: number;
    created_at: string;
}

export async function getPlaces(): Promise<BackendPlace[]> {
    return request<BackendPlace[]>('/places', {}, true);
}

export async function createPlace(
    label: string,
    lat: number,
    lon: number
): Promise<BackendPlace> {
    return request<BackendPlace>('/places', {
        method: 'POST',
        body: JSON.stringify({ label, lat, lon }),
    }, true);
}

// --- Family Location ---

export interface FamilyMember {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    last_lat: number | null;
    last_lon: number | null;
    safety_status: 'safe' | 'needs-help' | 'offering-help' | null;
    battery_level: number | null;

    last_location_update: string | null;
    last_address: string | null;
    role: 'admin' | 'member';
    safety_message?: string;
}

export async function getFamilyMembers(): Promise<{ family_id: string | null; members: FamilyMember[] }> {
    return request<{ family_id: string | null; members: FamilyMember[] }>('/family', {}, true);
}

export async function joinFamily(code: string): Promise<{ success: boolean; family_id: string; action: 'created' | 'joined'; member_count: number }> {
    return request<{ success: boolean; family_id: string; action: 'created' | 'joined'; member_count: number }>('/family/join', {
        method: 'POST',
        body: JSON.stringify({ code }),
    }, true);
}

export async function createFamily(): Promise<{ success: boolean; family_id: string; action: 'created' | 'joined'; member_count: number }> {
    // Generate a random 6-character code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return joinFamily(code);
}

export async function leaveFamily(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/family/leave', {
        method: 'POST',
    }, true);
}

export async function removeFamilyMember(memberId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/family/remove', {
        method: 'POST',
        body: JSON.stringify({ memberId }),
    }, true);
}

export async function updateStatus(
    lat: number,
    lon: number,
    status?: 'safe' | 'danger' | 'pending' | 'needs-help' | 'offering-help',
    batteryLevel?: number,
    message?: string
): Promise<{ success: boolean }> {
    const body: any = { lat, lon, battery_level: batteryLevel, message };
    if (status) body.status = status;

    return request<{ success: boolean }>('/user/status', {
        method: 'POST',
        body: JSON.stringify(body),
    }, true);
}

export async function syncGoogleUser(email: string, name: string): Promise<{ user: any; token: string }> {
    return request<{ user: any; token: string }>('/auth/google-sync', {
        method: 'POST',
        body: JSON.stringify({ email, name }),
    });
}

export async function updatePushToken(token: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/user/push-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
    }, true);
}

// --- Community ---

export interface CommunityResource {
    id: number;
    user_id: number;
    type: 'offering' | 'requesting';
    title: string;
    description: string;
    status: 'active' | 'claimed' | 'completed';
    lat: number;
    lon: number;
    created_at: string;
    posted_by?: string;
    public_tag?: string;
    dist_km?: number;
    distance?: string; // formatted
    timeAgo?: string; // formatted
}

export async function getNeighbors(): Promise<any[]> {
    return request<any[]>('/community/neighbors', {}, true);
}

export async function addNeighbor(tag: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/community/neighbors/add', {
        method: 'POST',
        body: JSON.stringify({ tag }),
    }, true);
}

export async function removeNeighbor(neighborId: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/community/neighbors/remove', {
        method: 'POST',
        body: JSON.stringify({ neighborId }),
    }, true);
}

export async function getCommunityResources(lat?: number, lon?: number, radiusKm = 50): Promise<CommunityResource[]> {
    let url = '/community/resources';
    if (lat !== undefined && lon !== undefined) {
        url += `?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`;
    }
    return request<CommunityResource[]>(url, {}, true);
}

export async function createCommunityResource(
    type: 'offering' | 'requesting',
    title: string,
    description: string,
    lat: number,
    lon: number
): Promise<CommunityResource> {
    return request<CommunityResource>('/community/resources', {
        method: 'POST',
        body: JSON.stringify({ type, title, description, lat, lon }),
    }, true);
}

export async function getUserProfile(): Promise<any> {
    return request<any>('/user/me', {}, true);
}

export async function sendChatMessage(message: string, lat?: number, lon?: number): Promise<{ response: string }> {
    return request<{ response: string }>('/chat', {
        method: 'POST',
        body: JSON.stringify({ message, lat, lon }),
    }, false);
}

// --- Navigation ---

export interface RouteStep {
    distance: number;
    duration: number;
    instruction?: string;
    name: string;
}

export interface RouteData {
    geometry: string; // Polyline format or GeoJSON string
    distance: number;
    duration: number;
    steps: RouteStep[];
    warnings?: { type: string; message: string; hazard: any }[];
    isSafe?: boolean;
}

export async function getRoute(
    start: [number, number],
    end: [number, number],
    mode: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<RouteData> {
    const path = `/route?startLat=${start[0]}&startLon=${start[1]}&endLat=${end[0]}&endLon=${end[1]}&mode=${mode}`;

    // Call our backend which proxies OSRM and adds hazard checks
    const route = await request<any>(path);

    return {
        geometry: JSON.stringify(route.geometry),
        distance: route.distance,
        duration: route.duration,
        steps: route.legs[0].steps.map((s: any) => ({
            distance: s.distance,
            duration: s.duration,
            instruction: s.maneuver?.instruction || 'Continue',
            name: s.name || '',
        })),
        warnings: route.warnings,
        isSafe: route.isSafe
    };
}
