export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          icon: string
          id: number
          name_en: string
          name_mk: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon: string
          id?: never
          name_en: string
          name_mk: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: never
          name_en?: string
          name_mk?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          last_message_at: string | null
          owner_id: string
          requester_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          last_message_at?: string | null
          owner_id: string
          requester_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          last_message_at?: string | null
          owner_id?: string
          requester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_conversations: {
        Row: {
          conversation_id: string
          hidden_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          hidden_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          hidden_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_images: {
        Row: {
          created_at: string
          id: string
          item_id: string
          position: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          position: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          position?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category_id: number
          created_at: string
          description: string
          id: string
          lat: number | null
          lng: number | null
          location: unknown
          location_name: string | null
          occurred_on: string
          resolved_at: string | null
          search_text: string
          search_vector: unknown
          status: Database["public"]["Enums"]["item_status"]
          title: string
          type: Database["public"]["Enums"]["item_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: number
          created_at?: string
          description: string
          id?: string
          lat?: number | null
          lng?: number | null
          location: unknown
          location_name?: string | null
          occurred_on: string
          resolved_at?: string | null
          search_text: string
          search_vector?: unknown
          status?: Database["public"]["Enums"]["item_status"]
          title: string
          type: Database["public"]["Enums"]["item_type"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          category_id?: number
          created_at?: string
          description?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location?: unknown
          location_name?: string | null
          occurred_on?: string
          resolved_at?: string | null
          search_text?: string
          search_vector?: unknown
          status?: Database["public"]["Enums"]["item_status"]
          title?: string
          type?: Database["public"]["Enums"]["item_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          breakdown: Json
          created_at: string
          found_item_id: string
          id: string
          lost_item_id: string
          score: number
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        Insert: {
          breakdown?: Json
          created_at?: string
          found_item_id: string
          id?: string
          lost_item_id: string
          score: number
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Update: {
          breakdown?: Json
          created_at?: string
          found_item_id?: string
          id?: string
          lost_item_id?: string
          score?: number
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_found_item_id_fkey"
            columns: ["found_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_lost_item_id_fkey"
            columns: ["lost_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          id: string
          read_at: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string
          id: string
          is_banned: boolean
          preferred_locale: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name: string
          id: string
          is_banned?: boolean
          preferred_locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_banned?: boolean
          preferred_locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          item_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          item_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          item_id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_category_item_counts: {
        Args: never
        Returns: {
          category_id: number
          item_count: number
        }[]
      }
      admin_list_users: {
        Args: {
          banned_only?: boolean
          page_offset?: number
          page_size?: number
          search?: string
        }
        Returns: {
          avatar_path: string
          created_at: string
          display_name: string
          email: string
          id: string
          is_banned: boolean
          item_count: number
          last_sign_in_at: string
          open_report_count: number
          role: Database["public"]["Enums"]["user_role"]
          total_count: number
        }[]
      }
      admin_reorder_categories: {
        Args: { category_ids: number[] }
        Returns: undefined
      }
      admin_set_banned: {
        Args: { banned: boolean; target_user_id: string }
        Returns: boolean
      }
      admin_stats: {
        Args: never
        Returns: {
          active_found_items: number
          active_lost_items: number
          banned_users: number
          confirmed_matches: number
          hidden_items: number
          matches: number
          open_reports: number
          reported_items: number
          users: number
        }[]
      }
      create_item: {
        Args: {
          category_id: number
          description: string
          image_paths?: string[]
          item_id?: string
          lat: number
          lng: number
          location_name?: string
          occurred_on: string
          title: string
          type: Database["public"]["Enums"]["item_type"]
        }
        Returns: string
      }
      current_profile: {
        Args: never
        Returns: {
          avatar_path: string | null
          created_at: string
          display_name: string
          id: string
          is_banned: boolean
          preferred_locale: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      hide_conversation: {
        Args: { conversation_id: string }
        Returns: undefined
      }
      items_in_bounds: {
        Args: {
          item_type?: Database["public"]["Enums"]["item_type"]
          max_lat: number
          max_lng: number
          max_rows?: number
          min_lat: number
          min_lng: number
        }
        Returns: {
          category_icon: string
          category_name_en: string
          category_name_mk: string
          category_slug: string
          cover_path: string
          id: string
          lat: number
          lng: number
          location_name: string
          occurred_on: string
          title: string
          total_count: number
          type: Database["public"]["Enums"]["item_type"]
        }[]
      }
      mark_conversation_read: {
        Args: { conversation_id: string }
        Returns: number
      }
      my_conversations: {
        Args: never
        Returns: {
          created_at: string
          id: string
          is_owner: boolean
          item_cover_path: string
          item_id: string
          item_status: Database["public"]["Enums"]["item_status"]
          item_title: string
          item_type: Database["public"]["Enums"]["item_type"]
          last_message_at: string
          last_message_body: string
          last_message_sender_id: string
          other_avatar_path: string
          other_display_name: string
          other_user_id: string
          unread_count: number
        }[]
      }
      search_item_locations: {
        Args: {
          category_slugs?: string[]
          date_from?: string
          date_to?: string
          item_status?: Database["public"]["Enums"]["item_status"]
          item_type?: Database["public"]["Enums"]["item_type"]
          max_rows?: number
          near_lat?: number
          near_lng?: number
          q?: string
          radius_km?: number
          sort?: string
        }
        Returns: {
          category_icon: string
          category_name_en: string
          category_name_mk: string
          category_slug: string
          cover_path: string
          id: string
          lat: number
          lng: number
          location_name: string
          occurred_on: string
          status: Database["public"]["Enums"]["item_status"]
          title: string
          total_count: number
          type: Database["public"]["Enums"]["item_type"]
        }[]
      }
      search_items: {
        Args: {
          category_slugs?: string[]
          date_from?: string
          date_to?: string
          item_status?: Database["public"]["Enums"]["item_status"]
          item_type?: Database["public"]["Enums"]["item_type"]
          near_lat?: number
          near_lng?: number
          page?: number
          page_size?: number
          q?: string
          radius_km?: number
          sort?: string
        }
        Returns: {
          category_icon: string
          category_id: number
          category_name_en: string
          category_name_mk: string
          category_slug: string
          cover_path: string
          created_at: string
          distance_m: number
          id: string
          is_favorite: boolean
          location_name: string
          occurred_on: string
          rank: number
          status: Database["public"]["Enums"]["item_status"]
          title: string
          total_count: number
          type: Database["public"]["Enums"]["item_type"]
        }[]
      }
      update_item: {
        Args: {
          category_id: number
          description: string
          image_paths?: string[]
          item_id: string
          lat: number
          lng: number
          location_name?: string
          occurred_on: string
          title: string
          type: Database["public"]["Enums"]["item_type"]
        }
        Returns: string[]
      }
    }
    Enums: {
      item_status: "active" | "resolved" | "hidden"
      item_type: "lost" | "found"
      match_status: "suggested" | "dismissed" | "confirmed"
      notification_type: "match" | "message" | "moderation"
      report_reason: "spam" | "inappropriate" | "fraud" | "duplicate" | "other"
      report_status: "open" | "resolved" | "dismissed"
      user_role: "user" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      item_status: ["active", "resolved", "hidden"],
      item_type: ["lost", "found"],
      match_status: ["suggested", "dismissed", "confirmed"],
      notification_type: ["match", "message", "moderation"],
      report_reason: ["spam", "inappropriate", "fraud", "duplicate", "other"],
      report_status: ["open", "resolved", "dismissed"],
      user_role: ["user", "admin"],
    },
  },
} as const
