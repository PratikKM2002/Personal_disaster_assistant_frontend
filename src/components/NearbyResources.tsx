import { useState } from 'react';
import { ChevronLeft, MapPin, Navigation, Phone, Clock, Building2, AlertTriangle, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    onClose: () => void;
}

type ResourceCategory = 'all' | 'shelters' | 'hospitals' | 'fire' | 'police' | 'supplies' | 'gas' | 'food';

interface Resource {
    id: string;
    name: string;
    type: string;
    category: ResourceCategory;
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

const RESOURCES: Resource[] = [
    {
        id: '1',
        name: 'Moscone Center',
        type: 'Emergency Shelter',
        category: 'shelters',
        distance: '0.8 mi',
        address: '747 Howard St, San Francisco',
        phone: '(415) 974-4000',
        hours: '24/7',
        status: 'open',
        capacity: '450/500 beds',
        icon: '🏠',
        coordinates: [-122.4014, 37.7844],
        inHazardZone: false
    },
    {
        id: '2',
        name: 'SF General Hospital',
        type: 'Trauma Center',
        category: 'hospitals',
        distance: '1.2 mi',
        address: '1001 Potrero Ave, San Francisco',
        phone: '(628) 206-8000',
        hours: '24/7',
        status: 'open',
        icon: '🏥',
        coordinates: [-122.4052, 37.7548],
        inHazardZone: false
    },
    {
        id: '3',
        name: 'Fire Station 7',
        type: 'Fire Department',
        category: 'fire',
        distance: '0.5 mi',
        address: '2300 Folsom St, San Francisco',
        phone: '(415) 558-3200',
        hours: '24/7',
        status: 'open',
        icon: '🚒',
        coordinates: [-122.4141, 37.7589],
        inHazardZone: true,
        hazardWarning: 'Near active wildfire zone'
    },
    {
        id: '4',
        name: 'SFPD Mission Station',
        type: 'Police Station',
        category: 'police',
        distance: '0.9 mi',
        address: '630 Valencia St, San Francisco',
        phone: '(415) 558-5400',
        hours: '24/7',
        status: 'open',
        icon: '🚔',
        coordinates: [-122.4218, 37.7627],
        inHazardZone: true,
        hazardWarning: 'Evacuation zone - use caution'
    },
    {
        id: '5',
        name: 'Red Cross Distribution',
        type: 'Supply Point',
        category: 'supplies',
        distance: '0.3 mi',
        address: '200 Market St, San Francisco',
        hours: '8AM - 8PM',
        status: 'open',
        icon: '📦',
        coordinates: [-122.3985, 37.7909],
        inHazardZone: false
    },
    {
        id: '6',
        name: 'Water Station - Civic',
        type: 'Water Distribution',
        category: 'supplies',
        distance: '0.6 mi',
        address: 'Civic Center Plaza',
        hours: '6AM - 10PM',
        status: 'open',
        icon: '💧',
        coordinates: [-122.4180, 37.7793],
        inHazardZone: false
    },
    {
        id: '7',
        name: 'Shell Station',
        type: 'Gas Station',
        category: 'gas',
        distance: '0.4 mi',
        address: '1200 Guerrero St, San Francisco',
        hours: 'Open',
        status: 'limited',
        icon: '⛽',
        coordinates: [-122.4234, 37.7515],
        inHazardZone: true,
        hazardWarning: 'Inside evacuation perimeter'
    },
    {
        id: '8',
        name: 'UCSF Medical Center',
        type: 'Hospital',
        category: 'hospitals',
        distance: '2.1 mi',
        address: '505 Parnassus Ave, San Francisco',
        phone: '(415) 476-1000',
        hours: '24/7',
        status: 'open',
        icon: '🏥',
        coordinates: [-122.4577, 37.7631],
        inHazardZone: false
    },
    {
        id: '9',
        name: 'Bill Graham Civic Auditorium',
        type: 'Emergency Shelter',
        category: 'shelters',
        distance: '0.7 mi',
        address: '99 Grove St, San Francisco',
        hours: '24/7',
        status: 'open',
        capacity: '280/400 beds',
        icon: '🏠',
        coordinates: [-122.4168, 37.7784],
        inHazardZone: false
    },
    {
        id: '10',
        name: 'Food Bank SF',
        type: 'Food Distribution',
        category: 'food',
        distance: '1.5 mi',
        address: '900 Pennsylvania Ave, San Francisco',
        hours: '9AM - 5PM',
        status: 'open',
        icon: '🍲',
        coordinates: [-122.3936, 37.7540],
        inHazardZone: true,
        hazardWarning: 'Adjacent to hazard zone'
    },
];

const CATEGORIES = [
    { id: 'all', label: 'All', icon: '📍' },
    { id: 'shelters', label: 'Shelters', icon: '🏠' },
    { id: 'hospitals', label: 'Hospitals', icon: '🏥' },
    { id: 'fire', label: 'Fire', icon: '🚒' },
    { id: 'police', label: 'Police', icon: '🚔' },
    { id: 'supplies', label: 'Supplies', icon: '📦' },
    { id: 'gas', label: 'Gas', icon: '⛽' },
    { id: 'food', label: 'Food', icon: '🍲' },
];

export function NearbyResources({ onClose }: Props) {
    const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>('all');
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [showSafeOnly, setShowSafeOnly] = useState(false);

    const filteredResources = RESOURCES.filter(r => {
        const categoryMatch = selectedCategory === 'all' || r.category === selectedCategory;
        const safeMatch = !showSafeOnly || !r.inHazardZone;
        return categoryMatch && safeMatch;
    });

    const hazardCount = RESOURCES.filter(r => r.inHazardZone).length;

    const handleNavigate = (resource: Resource) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${resource.coordinates[1]},${resource.coordinates[0]}`;
        window.open(url, '_blank');
    };

    const handleCall = (phone: string) => {
        window.open(`tel:${phone}`, '_self');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'limited': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'closed': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    // Detail View
    if (selectedResource) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
                <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className={clsx(
                        "sticky top-0 p-4 z-10 shrink-0",
                        selectedResource.inHazardZone
                            ? "bg-gradient-to-r from-orange-600 to-red-600"
                            : "bg-gradient-to-r from-blue-600 to-cyan-600"
                    )}>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedResource(null)}
                                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <ChevronLeft size={18} className="text-white" />
                            </button>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                                {selectedResource.icon}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-white font-bold text-lg">{selectedResource.name}</h2>
                                <p className="text-white/70 text-xs">{selectedResource.type}</p>
                            </div>
                        </div>

                        {/* Hazard Zone Warning in Detail */}
                        {selectedResource.inHazardZone && (
                            <div className="mt-3 bg-white/10 border border-white/20 rounded-lg p-2 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-yellow-300 shrink-0" />
                                <p className="text-white text-xs flex-1">
                                    ⚠️ <span className="font-bold">HAZARD ZONE:</span> {selectedResource.hazardWarning || 'Located in hazardous area'}
                                </p>
                            </div>
                        )}

                        {/* Safe Zone Badge in Detail */}
                        {!selectedResource.inHazardZone && (
                            <div className="mt-3 bg-green-500/20 border border-green-500/30 rounded-lg p-2 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-green-400 shrink-0" />
                                <p className="text-green-300 text-xs flex-1">
                                    ✓ <span className="font-bold">SAFE ZONE:</span> Outside hazard area
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Status */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className={clsx(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium",
                                getStatusColor(selectedResource.status)
                            )}>
                                <div className={clsx(
                                    "w-2 h-2 rounded-full",
                                    selectedResource.status === 'open' ? 'bg-green-400 animate-pulse' :
                                        selectedResource.status === 'limited' ? 'bg-yellow-400' : 'bg-red-400'
                                )} />
                                {selectedResource.status === 'open' ? 'Open Now' :
                                    selectedResource.status === 'limited' ? 'Limited Service' : 'Closed'}
                            </div>

                            {/* Zone Badge */}
                            <div className={clsx(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                                selectedResource.inHazardZone
                                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                    : "bg-green-500/20 text-green-400 border border-green-500/30"
                            )}>
                                {selectedResource.inHazardZone ? (
                                    <>
                                        <AlertTriangle size={14} />
                                        Hazard Zone
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={14} />
                                        Safe Zone
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Info Cards */}
                        <div className="space-y-3">
                            {/* Address */}
                            <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3">
                                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                                    <MapPin size={18} className="text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Address</p>
                                    <p className="text-white text-sm">{selectedResource.address}</p>
                                    <p className="text-blue-400 text-sm mt-1">{selectedResource.distance} away</p>
                                </div>
                            </div>

                            {/* Hours */}
                            {selectedResource.hours && (
                                <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3">
                                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                                        <Clock size={18} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Hours</p>
                                        <p className="text-white text-sm">{selectedResource.hours}</p>
                                    </div>
                                </div>
                            )}

                            {/* Capacity */}
                            {selectedResource.capacity && (
                                <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3">
                                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                                        <Building2 size={18} className="text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Current Capacity</p>
                                        <p className="text-white text-sm">{selectedResource.capacity}</p>
                                        <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                                                style={{ width: '90%' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Phone */}
                            {selectedResource.phone && (
                                <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3">
                                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                                        <Phone size={18} className="text-orange-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1">Phone</p>
                                        <p className="text-white text-sm">{selectedResource.phone}</p>
                                    </div>
                                    <button
                                        onClick={() => handleCall(selectedResource.phone!)}
                                        className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
                                    >
                                        Call
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0">
                        <button
                            onClick={() => handleNavigate(selectedResource)}
                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-2xl font-semibold flex items-center justify-center gap-2 text-white transition-all"
                        >
                            <Navigation size={18} />
                            Get Directions
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
            <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-4 z-10 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <ChevronLeft size={18} className="text-white" />
                            </button>
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Building2 size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">Nearby Resources</h2>
                                <p className="text-white/70 text-xs">{filteredResources.length} locations found</p>
                            </div>
                        </div>
                    </div>

                    {/* Hazard Warning Banner */}
                    {hazardCount > 0 && (
                        <div className="mt-3 bg-orange-500/20 border border-orange-500/30 rounded-lg p-2 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-orange-400 shrink-0" />
                            <p className="text-orange-200 text-xs flex-1">
                                {hazardCount} location{hazardCount > 1 ? 's' : ''} in hazard zone
                            </p>
                            <button
                                onClick={() => setShowSafeOnly(!showSafeOnly)}
                                className={clsx(
                                    "px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1",
                                    showSafeOnly
                                        ? "bg-green-500 text-white"
                                        : "bg-white/20 text-white hover:bg-white/30"
                                )}
                            >
                                <ShieldCheck size={12} />
                                {showSafeOnly ? 'Safe Only' : 'Show All'}
                            </button>
                        </div>
                    )}

                    {/* Category Filter */}
                    <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar pb-1">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id as ResourceCategory)}
                                className={clsx(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                                    selectedCategory === cat.id
                                        ? "bg-white text-gray-900"
                                        : "bg-white/10 text-white hover:bg-white/20"
                                )}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Resource List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {filteredResources.map(resource => (
                            <button
                                key={resource.id}
                                onClick={() => setSelectedResource(resource)}
                                className={clsx(
                                    "w-full rounded-xl p-3 flex items-center gap-3 transition-colors text-left relative",
                                    resource.inHazardZone
                                        ? "bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20"
                                        : "bg-white/5 hover:bg-white/10"
                                )}
                            >
                                {/* Hazard Zone Indicator */}
                                {resource.inHazardZone && (
                                    <div className="absolute top-2 right-2">
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/30 rounded text-[9px] text-orange-300 font-medium">
                                            <AlertTriangle size={10} />
                                            HAZARD
                                        </div>
                                    </div>
                                )}

                                {/* Safe Zone Indicator */}
                                {!resource.inHazardZone && (
                                    <div className="absolute top-2 right-2">
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 rounded text-[9px] text-green-400 font-medium">
                                            <ShieldCheck size={10} />
                                            SAFE
                                        </div>
                                    </div>
                                )}

                                <div className={clsx(
                                    "w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0",
                                    resource.inHazardZone ? "bg-orange-500/20" : "bg-white/10"
                                )}>
                                    {resource.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 pr-16">
                                        <p className="text-white font-medium text-sm truncate">{resource.name}</p>
                                        <span className={clsx(
                                            "px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0",
                                            getStatusColor(resource.status)
                                        )}>
                                            {resource.status === 'open' ? 'Open' :
                                                resource.status === 'limited' ? 'Limited' : 'Closed'}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-xs truncate">{resource.type}</p>
                                    {resource.inHazardZone && resource.hazardWarning && (
                                        <p className="text-orange-400 text-xs flex items-center gap-1 mt-0.5">
                                            <AlertTriangle size={10} />
                                            {resource.hazardWarning}
                                        </p>
                                    )}
                                    {!resource.inHazardZone && resource.capacity && (
                                        <p className="text-blue-400 text-xs">{resource.capacity}</p>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-white text-sm font-medium">{resource.distance}</p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNavigate(resource);
                                        }}
                                        className={clsx(
                                            "mt-1 px-2 py-1 rounded text-xs transition-colors flex items-center gap-1",
                                            resource.inHazardZone
                                                ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                                                : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                        )}
                                    >
                                        <Navigation size={10} />
                                        Go
                                    </button>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setSelectedCategory('shelters')}
                            className="py-3 px-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl font-medium flex items-center justify-center gap-2 text-green-400 hover:from-green-500/30 hover:to-emerald-500/30 transition-all"
                        >
                            🏠 Shelters
                        </button>
                        <button
                            onClick={() => setSelectedCategory('hospitals')}
                            className="py-3 px-4 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/30 rounded-xl font-medium flex items-center justify-center gap-2 text-red-400 hover:from-red-500/30 hover:to-rose-500/30 transition-all"
                        >
                            🏥 Hospitals
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
