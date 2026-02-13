export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      places: {
        Row: {
          id: string
          name: string
          category: Database["public"]["Enums"]["place_category"]
          latitude: number
          longitude: number
          address: string | null
          description: string | null
          rating: number
          review_count: number
          images: string[]
          amenities: Json
          contact_info: Json
          opening_hours: Json
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: Database["public"]["Enums"]["place_category"]
          latitude: number
          longitude: number
          address?: string | null
          description?: string | null
          rating?: number
          review_count?: number
          images?: string[]
          amenities?: Json
          contact_info?: Json
          opening_hours?: Json
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: Database["public"]["Enums"]["place_category"]
          latitude?: number
          longitude?: number
          address?: string | null
          description?: string | null
          rating?: number
          review_count?: number
          images?: string[]
          amenities?: Json
          contact_info?: Json
          opening_hours?: Json
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users_profile: {
        Row: {
          id: string
          full_name: string | null
          phone_number: string | null
          profile_picture_url: string | null
          preferred_language: string
          emergency_contacts: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone_number?: string | null
          profile_picture_url?: string | null
          preferred_language?: string
          emergency_contacts?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone_number?: string | null
          profile_picture_url?: string | null
          preferred_language?: string
          emergency_contacts?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          id: string
          user_id: string
          title: string
          from_location: string
          destination: string
          start_date: string
          end_date: string
          days: number
          budget: number | null
          preferences: Json
          status: Database["public"]["Enums"]["trip_status"]
          itinerary: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          from_location: string
          destination: string
          start_date: string
          end_date: string
          days: number
          budget?: number | null
          preferences?: Json
          status?: Database["public"]["Enums"]["trip_status"]
          itinerary?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          from_location?: string
          destination?: string
          start_date?: string
          end_date?: string
          days?: number
          budget?: number | null
          preferences?: Json
          status?: Database["public"]["Enums"]["trip_status"]
          itinerary?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          booking_type: Database["public"]["Enums"]["booking_type"]
          provider_name: string | null
          booking_reference: string | null
          booking_date: string
          amount: number | null
          status: Database["public"]["Enums"]["booking_status"]
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id: string
          booking_type: Database["public"]["Enums"]["booking_type"]
          provider_name?: string | null
          booking_reference?: string | null
          booking_date: string
          amount?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          user_id?: string
          booking_type?: Database["public"]["Enums"]["booking_type"]
          provider_name?: string | null
          booking_reference?: string | null
          booking_date?: string
          amount?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          details?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          place_id: string
          user_id: string
          rating: number
          comment: string | null
          images: string[]
          helpful_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          place_id: string
          user_id: string
          rating: number
          comment?: string | null
          images?: string[]
          helpful_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          place_id?: string
          user_id?: string
          rating?: number
          comment?: string | null
          images?: string[]
          helpful_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          }
        ]
      }
      sos_alerts: {
        Row: {
          id: string
          user_id: string
          latitude: number
          longitude: number
          alert_type: Database["public"]["Enums"]["alert_type"]
          status: Database["public"]["Enums"]["alert_status"]
          description: string | null
          emergency_contacts_notified: boolean
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          latitude: number
          longitude: number
          alert_type: Database["public"]["Enums"]["alert_type"]
          status?: Database["public"]["Enums"]["alert_status"]
          description?: string | null
          emergency_contacts_notified?: boolean
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          latitude?: number
          longitude?: number
          alert_type?: Database["public"]["Enums"]["alert_type"]
          status?: Database["public"]["Enums"]["alert_status"]
          description?: string | null
          emergency_contacts_notified?: boolean
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          }
        ]
      }
      saved_places: {
        Row: {
          id: string
          user_id: string
          place_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          place_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          place_id?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_places_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      place_category:
        | "temple"
        | "hospital"
        | "emergency"
        | "hidden_spot"
        | "hostel"
        | "hotel"
        | "restaurant"
        | "landmark"
        | "destination"
        | "bus_route"
        | "transport"
        | "tourist"
        | "metro"
        | "police"
        | "fire_station"
        | "pharmacy"
        | "railway"
        | "health_centre"
      trip_status:
        | "planning"
        | "confirmed"
        | "ongoing"
        | "completed"
        | "cancelled"
      booking_type:
        | "transport"
        | "accommodation"
        | "activity"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
      alert_type:
        | "medical"
        | "security"
        | "accident"
        | "other"
      alert_status:
        | "active"
        | "resolved"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      place_category: [
        "temple",
        "hospital",
        "emergency",
        "hidden_spot",
        "hostel",
        "hotel",
        "restaurant",
        "landmark",
        "destination",
        "bus_route",
        "transport",
        "tourist",
        "metro",
        "police",
        "fire_station",
        "pharmacy",
        "railway",
        "health_centre",
      ] as const,
      trip_status: [
        "planning",
        "confirmed",
        "ongoing",
        "completed",
        "cancelled",
      ] as const,
      booking_type: [
        "transport",
        "accommodation",
        "activity",
      ] as const,
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
      ] as const,
      alert_type: [
        "medical",
        "security",
        "accident",
        "other",
      ] as const,
      alert_status: [
        "active",
        "resolved",
        "cancelled",
      ] as const,
    },
  },
} as const
