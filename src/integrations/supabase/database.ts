/**
 * Database Helper Functions
 * Provides easy-to-use database operations for Mini Gudie
 */

import { supabase } from './client';
import type { Database } from './types';

// Type aliases for better readability
type Place = Database['public']['Tables']['places']['Row'];
type PlaceInsert = Database['public']['Tables']['places']['Insert'];
type Trip = Database['public']['Tables']['trips']['Row'];
type TripInsert = Database['public']['Tables']['trips']['Insert'];
type Review = Database['public']['Tables']['reviews']['Row'];
type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];
type SOSAlert = Database['public']['Tables']['sos_alerts']['Row'];
type SOSAlertInsert = Database['public']['Tables']['sos_alerts']['Insert'];
type SavedPlace = Database['public']['Tables']['saved_places']['Row'];

// ============================================================================
// PLACES
// ============================================================================

/**
 * Get all places with optional filtering
 */
export const getPlaces = async (filters?: {
    category?: string;
    verified?: boolean;
    minRating?: number;
    limit?: number;
}) => {
    let query = supabase.from('places').select('*');

    if (filters?.category) {
        query = query.eq('category', filters.category);
    }
    if (filters?.verified !== undefined) {
        query = query.eq('verified', filters.verified);
    }
    if (filters?.minRating) {
        query = query.gte('rating', filters.minRating);
    }
    if (filters?.limit) {
        query = query.limit(filters.limit);
    }

    query = query.order('rating', { ascending: false });

    return await query;
};

/**
 * Get a single place by ID
 */
export const getPlaceById = async (id: string) => {
    return await supabase
        .from('places')
        .select('*')
        .eq('id', id)
        .single();
};

/**
 * Search places by name or description
 */
export const searchPlaces = async (searchTerm: string) => {
    return await supabase
        .from('places')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('rating', { ascending: false });
};

/**
 * Get nearby places (requires latitude and longitude)
 */
export const getNearbyPlaces = async (
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    category?: string
) => {
    // Note: This is a simplified version. For production, use PostGIS functions
    let query = supabase
        .from('places')
        .select('*');

    if (category) {
        query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error || !data) return { data: null, error };

    // Filter by distance (simplified calculation)
    const filtered = data.filter((place) => {
        const distance = calculateDistance(
            latitude,
            longitude,
            Number(place.latitude),
            Number(place.longitude)
        );
        return distance <= radiusKm;
    });

    return { data: filtered, error: null };
};

/**
 * Create a new place
 */
export const createPlace = async (place: PlaceInsert) => {
    return await supabase
        .from('places')
        .insert(place)
        .select()
        .single();
};

/**
 * Update a place
 */
export const updatePlace = async (id: string, updates: Partial<PlaceInsert>) => {
    return await supabase
        .from('places')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
};

// ============================================================================
// TRIPS
// ============================================================================

/**
 * Get user's trips
 */
export const getUserTrips = async (userId: string, status?: string) => {
    let query = supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId);

    if (status) {
        query = query.eq('status', status);
    }

    return await query.order('created_at', { ascending: false });
};

/**
 * Get a single trip by ID
 */
export const getTripById = async (id: string) => {
    return await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();
};

/**
 * Create a new trip
 */
export const createTrip = async (trip: TripInsert) => {
    return await supabase
        .from('trips')
        .insert(trip)
        .select()
        .single();
};

/**
 * Update a trip
 */
export const updateTrip = async (id: string, updates: Partial<TripInsert>) => {
    return await supabase
        .from('trips')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
};

/**
 * Delete a trip
 */
export const deleteTrip = async (id: string) => {
    return await supabase
        .from('trips')
        .delete()
        .eq('id', id);
};

// ============================================================================
// REVIEWS
// ============================================================================

/**
 * Get reviews for a place
 */
export const getPlaceReviews = async (placeId: string) => {
    return await supabase
        .from('reviews')
        .select(`
      *,
      users_profile:user_id (
        full_name,
        profile_picture_url
      )
    `)
        .eq('place_id', placeId)
        .order('created_at', { ascending: false });
};

/**
 * Get user's reviews
 */
export const getUserReviews = async (userId: string) => {
    return await supabase
        .from('reviews')
        .select(`
      *,
      places:place_id (
        name,
        category,
        images
      )
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
};

/**
 * Create a review
 */
export const createReview = async (review: ReviewInsert) => {
    return await supabase
        .from('reviews')
        .insert(review)
        .select()
        .single();
};

/**
 * Update a review
 */
export const updateReview = async (id: string, updates: Partial<ReviewInsert>) => {
    return await supabase
        .from('reviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
};

/**
 * Delete a review
 */
export const deleteReview = async (id: string) => {
    return await supabase
        .from('reviews')
        .delete()
        .eq('id', id);
};

// ============================================================================
// SOS ALERTS
// ============================================================================

/**
 * Create an SOS alert
 */
export const createSOSAlert = async (alert: SOSAlertInsert) => {
    return await supabase
        .from('sos_alerts')
        .insert(alert)
        .select()
        .single();
};

/**
 * Get user's SOS alerts
 */
export const getUserSOSAlerts = async (userId: string) => {
    return await supabase
        .from('sos_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
};

/**
 * Update SOS alert status
 */
export const updateSOSAlertStatus = async (
    id: string,
    status: 'active' | 'resolved' | 'cancelled'
) => {
    return await supabase
        .from('sos_alerts')
        .update({
            status,
            resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();
};

// ============================================================================
// SAVED PLACES
// ============================================================================

/**
 * Get user's saved places
 */
export const getSavedPlaces = async (userId: string) => {
    return await supabase
        .from('saved_places')
        .select(`
      *,
      places:place_id (
        id,
        name,
        category,
        latitude,
        longitude,
        rating,
        images,
        description
      )
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
};

/**
 * Save a place
 */
export const savePlace = async (userId: string, placeId: string, notes?: string) => {
    return await supabase
        .from('saved_places')
        .insert({
            user_id: userId,
            place_id: placeId,
            notes,
        })
        .select()
        .single();
};

/**
 * Remove a saved place
 */
export const removeSavedPlace = async (userId: string, placeId: string) => {
    return await supabase
        .from('saved_places')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', placeId);
};

/**
 * Check if a place is saved
 */
export const isPlaceSaved = async (userId: string, placeId: string) => {
    const { data, error } = await supabase
        .from('saved_places')
        .select('id')
        .eq('user_id', userId)
        .eq('place_id', placeId)
        .single();

    return { isSaved: !!data && !error, error };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Subscribe to real-time changes for a table
 */
export const subscribeToTable = <T>(
    table: string,
    callback: (payload: any) => void,
    filter?: { column: string; value: string }
) => {
    let channel = supabase.channel(`${table}-changes`);

    const subscription = channel.on(
        'postgres_changes',
        {
            event: '*',
            schema: 'public',
            table,
            ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
        },
        callback
    );

    return subscription.subscribe();
};
