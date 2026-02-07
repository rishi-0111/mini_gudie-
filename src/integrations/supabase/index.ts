/**
 * Supabase Integration Index
 * Central export point for all Supabase functionality
 */

// Core client
export { supabase } from './client';

// Authentication
export * from './auth';

// Database operations
export * from './database';

// Storage operations
export * from './storage';

// Types
export type { Database } from './types';
