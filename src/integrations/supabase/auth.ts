/**
 * Authentication Helper Functions
 * Provides easy-to-use authentication methods for Mini Gudie
 */

import { supabase } from './client';
import type { AuthError, User, Session } from '@supabase/supabase-js';

export interface AuthResponse {
    user: User | null;
    session: Session | null;
    error: AuthError | null;
}

export interface SignUpData {
    email: string;
    password: string;
    fullName?: string;
    phoneNumber?: string;
}

export interface SignInData {
    email: string;
    password: string;
}

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async ({
    email,
    password,
    fullName,
    phoneNumber,
}: SignUpData): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                phone_number: phoneNumber,
            },
        },
    });

    return {
        user: data.user,
        session: data.session,
        error,
    };
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async ({
    email,
    password,
}: SignInData): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    return {
        user: data.user,
        session: data.session,
        error,
    };
};

/**
 * Alias for signInWithEmail (for better naming consistency)
 */
export const signInWithPassword = signInWithEmail;

/**
 * Sign in with email OTP (passwordless)
 */
export const signInWithEmailOTP = async (email: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
    });

    return { error };
};

/**
 * Sign in with phone OTP
 */
export const signInWithPhoneOTP = async (phone: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
            channel: 'sms',
        },
    });

    return { error };
};

/**
 * Verify OTP code
 */
export const verifyOTP = async (
    emailOrPhone: string,
    token: string,
    type: 'email' | 'sms'
): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.verifyOtp({
        [type === 'email' ? 'email' : 'phone']: emailOrPhone,
        token,
        type: type === 'email' ? 'email' : 'sms',
    });

    return {
        user: data.user,
        session: data.session,
        error,
    };
};

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });

    return { error };
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

/**
 * Get current session
 */
export const getCurrentSession = async (): Promise<Session | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (updates: {
    fullName?: string;
    phoneNumber?: string;
    profilePictureUrl?: string;
    preferredLanguage?: string;
    emergencyContacts?: Array<{ name: string; phone: string; relation: string }>;
}): Promise<{ error: Error | null }> => {
    const user = await getCurrentUser();

    if (!user) {
        return { error: new Error('No user logged in') };
    }

    const { error } = await supabase
        .from('users_profile')
        .update({
            full_name: updates.fullName,
            phone_number: updates.phoneNumber,
            profile_picture_url: updates.profilePictureUrl,
            preferred_language: updates.preferredLanguage,
            emergency_contacts: updates.emergencyContacts,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

    return { error };
};

/**
 * Get user profile
 */
export const getUserProfile = async (userId?: string) => {
    const user = userId ? { id: userId } : await getCurrentUser();

    if (!user) {
        return { data: null, error: new Error('No user found') };
    }

    const { data, error } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', user.id)
        .single();

    return { data, error };
};

/**
 * Reset password
 */
export const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    return { error };
};

/**
 * Update password
 */
export const updatePassword = async (newPassword: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    return { error };
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (
    callback: (event: string, session: Session | null) => void
) => {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
    const session = await getCurrentSession();
    return session !== null;
};
