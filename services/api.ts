
import { showToast } from '@/components/Toast';
import NetInfo from '@react-native-community/netinfo';

// --- Configuration ---
// Uses the deployed Render backend by default.
// Override with EXPO_PUBLIC_API_URL env var to use a local backend.
const DEPLOYED_BACKEND = 'https://guardian-ai-backend-vuj9.onrender.com';

function getApiBaseUrl(): string {
    // Always use the deployed backend — the local DB doesn't have
    // ingested hazard / alert data, so local would show 0 alerts.
    // To develop against a local backend instead, set EXPO_PUBLIC_API_URL
    // in your .env to e.g. http://10.0.0.192:8000
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }
    return DEPLOYED_BACKEND;
}

const API_BASE_URL = getApiBaseUrl();

let tokenProvider: (() => Promise<string | null>) | null = null;
let currentUserInfo: { email: string; name: string } | null = null;

export function setTokenProvider(provider: () => Promise<string | null>, userInfo: { email: string; name: string } | null = null) {
    tokenProvider = provider;
    currentUserInfo = userInfo;
}

// --- Retry / Timeout config ---
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;   // 1s, then 2s
const REQUEST_TIMEOUT_MS = 15000;
const CHAT_TIMEOUT_MS = 30000; // Chat AI needs more time

// --- HTTP Helpers ---

async function request<T>(
    path: string,
    options: RequestInit = {},
    auth = false,
    silent = false
): Promise<T> {
    // Use longer timeout for chat endpoint
    const timeoutMs = path.startsWith('/chat') ? CHAT_TIMEOUT_MS : REQUEST_TIMEOUT_MS;

    // Check network connectivity first
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
        showToast('error', 'No Internet', 'Check your connection and try again.');
        throw new ApiError('No internet connection', 0);
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
        ...(options.headers as Record<string, string>),
    };

    if (auth && tokenProvider) {
        const token = await tokenProvider();
        if (token && token !== 'null') {
            headers['Authorization'] = `Bearer ${token}`;
            if (currentUserInfo && currentUserInfo.email) {
                headers['x-user-email'] = currentUserInfo.email;
                headers['x-user-name'] = currentUserInfo.name;
            }
        } else {
            // Token not ready yet — fail fast instead of sending a doomed 401 request
            throw new ApiError('Unauthorized', 401);
        }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Timeout via AbortController
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);

            const res = await fetch(`${API_BASE_URL}${path}`, {
                ...options,
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            // If server error (5xx), retry
            if (res.status >= 500 && attempt < MAX_RETRIES) {
                lastError = new ApiError(`Server error ${res.status}`, res.status);
                await delay(BASE_DELAY_MS * Math.pow(2, attempt));
                continue;
            }

            // Safe JSON parsing — handle non-JSON responses gracefully
            const text = await res.text();
            let data: any;
            try {
                data = JSON.parse(text);
            } catch {
                throw new ApiError(
                    `Invalid response from server (status ${res.status})`,
                    res.status
                );
            }

            if (!res.ok) {
                throw new ApiError(data.error || 'Request failed', res.status);
            }

            return data as T;
        } catch (err: any) {
            // Aborted = timeout
            if (err.name === 'AbortError') {
                lastError = new ApiError('Request timed out', 0);
            } else if (err instanceof ApiError) {
                lastError = err;
            } else {
                // Network error (fetch failed entirely)
                lastError = new ApiError(err.message || 'Network error', 0);
            }

            // Retry on network/timeout errors (not on 4xx client errors)
            if (attempt < MAX_RETRIES && !(lastError instanceof ApiError && (lastError as ApiError).status >= 400 && (lastError as ApiError).status < 500)) {
                await delay(BASE_DELAY_MS * Math.pow(2, attempt));
                continue;
            }
        }
    }

    // All retries exhausted — show toast only for genuine client errors
    const errMsg = lastError?.message || 'Something went wrong';
    const status = (lastError as ApiError)?.status || 0;
    // Don't toast on 5xx (server restart), 401 (token not ready), or 0 (network blip)
    if (!silent && status >= 400 && status < 500 && status !== 401) {
        showToast('error', 'Request Failed', errMsg);
    }
    throw lastError || new ApiError('Unknown error', 0);
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    role?: string;
}

export async function getProfile(): Promise<UserProfile> {
    return request<UserProfile>('/user/me', {}, true);
}

export async function updateProfile(data: { phone?: string; blood_type?: string }): Promise<{ success: boolean }> {
    return request('/user/profile', { method: 'PUT', body: JSON.stringify(data) }, true);
}

export async function addEmergencyContact(contact: { name: string; phone: string; relationship?: string; is_primary?: boolean }): Promise<EmergencyContact> {
    return request('/user/contacts', { method: 'POST', body: JSON.stringify(contact) }, true);
}

export async function deleteEmergencyContact(id: number): Promise<{ success: boolean }> {
    return request(`/user/contacts/${id}`, { method: 'DELETE' }, true);
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
    return request<OverviewResponse>(url, {}, true);
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

export async function getAlerts(lat?: number, lon?: number, radiusKm = 500, minSeverity?: number): Promise<BackendAlert[]> {
    let url = '/alerts';
    if (lat !== undefined && lon !== undefined) {
        url += `?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`;
        if (minSeverity !== undefined && minSeverity > 0) {
            url += `&min_severity=${minSeverity}`;
        }
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

export async function getFamilyMembers(): Promise<{ family_id: string | null; members: FamilyMember[]; my_role: string }> {
    return request<{ family_id: string | null; members: FamilyMember[]; my_role: string }>('/family', {}, true);
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

export async function syncGoogleUser(email: string, name: string, idToken: string): Promise<{ user: any; token: string }> {
    // Use silent mode — this is a background sync, don't show error toasts
    return request<{ user: any; token: string }>('/auth/google-sync', {
        method: 'POST',
        body: JSON.stringify({ email, name, idToken }),
    }, false, true);
}

export async function updatePushToken(token: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/user/push-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
    }, true);
}

export async function sendSOS(lat: number, lon: number): Promise<{ success: boolean; notified: number }> {
    return request<{ success: boolean; notified: number }>('/sos', {
        method: 'POST',
        body: JSON.stringify({ lat, lon }),
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


export async function sendChatMessage(message: string, lat?: number, lon?: number): Promise<{ response: string }> {
    return request<{ response: string }>('/chat', {
        method: 'POST',
        body: JSON.stringify({ message, lat, lon }),
    }, true);
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
        steps: (route.legs?.[0]?.steps || []).map((s: any) => ({
            distance: s.distance,
            duration: s.duration,
            instruction: s.maneuver?.instruction || 'Continue',
            name: s.name || '',
        })),
        warnings: route.warnings,
        isSafe: route.isSafe
    };
}

// ─── Place Search (Nominatim Geocoding) ───────────────────────────

export interface PlaceResult {
    placeId: string;
    displayName: string;
    name: string;
    lat: number;
    lon: number;
    type: string;
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
    if (!query || query.trim().length < 2) return [];
    const encoded = encodeURIComponent(query.trim());
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&addressdetails=1`;

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'GuardianAI-DisasterApp/1.0',
            'Accept': 'application/json',
        },
    });

    if (!res.ok) return [];
    const data = await res.json();

    return data.map((item: any) => ({
        placeId: item.place_id?.toString() || item.osm_id?.toString(),
        displayName: item.display_name,
        name: item.display_name?.split(',')[0] || item.name || query,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type || item.class || 'place',
    }));
}

// ─── Hazards for Navigation Corridor ───────────────────────────────

export async function getHazardsForNavigation(
    lat: number, lon: number, radiusKm: number = 50
): Promise<any[]> {
    try {
        const path = `/hazards?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`;
        const hazards = await request<any[]>(path);
        return hazards || [];
    } catch {
        return [];
    }
}


// ==============================
// Document Vault API
// ==============================

export interface UploadedDocument {
    success: boolean;
    key: string;
    fileName: string;
}

export interface DocumentItem {
    key: string;
    fileName: string;
    category: string;
    mimeType: string;
    size: number;
    lastModified: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
    const token = await tokenProvider?.();
    return {
        Authorization: `Bearer ${token}`,
    };
}

export async function uploadDocument(
    file: { uri: string; name: string; mimeType?: string },
    category: string
): Promise<UploadedDocument> {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
        throw new ApiError('No internet', 0);
    }

    const formData = new FormData();
    formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
    } as any);
    formData.append('category', category);

    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
        showToast('error', 'Upload Failed', data.error || 'Unknown error');
        throw new ApiError(data.error, response.status);
    }

    return data;
}

export async function listDocuments(): Promise<DocumentItem[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/documents/list`, { headers });

    if (!response.ok) {
        throw new ApiError('Failed to fetch documents', response.status);
    }

    return response.json();
}

export function getPreviewUrl(key: string) {
    return `${API_BASE_URL}/documents/preview?key=${encodeURIComponent(key)}`;
}

export async function getPreviewHeaders() {
    return await getAuthHeaders();
}

export async function fetchPreviewBase64(key: string): Promise<string> {
    const headers = await getAuthHeaders();
    const response = await fetch(
        `${API_BASE_URL}/documents/preview?key=${encodeURIComponent(key)}`,
        { headers }
    );

    if (!response.ok) {
        throw new ApiError('Preview failed', response.status);
    }

    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export async function downloadDocumentFile(key: string, fileName: string) {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/documents/download?key=${encodeURIComponent(key)}`,
            { headers }
        );

        if (!response.ok) {
            throw new ApiError('Download failed', response.status);
        }

        showToast('success', 'Downloaded', fileName);
        return true;
    } catch (e: any) {
        showToast('error', 'Download Failed', e.message);
        throw e;
    }
}
