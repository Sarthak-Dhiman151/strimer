export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      colleges: {
        Row: {
          city: string | null;
          created_at: string;
          email_domains: string[];
          fee_max: number | null;
          fee_min: number | null;
          id: string;
          name: string;
          nirf_rank: number | null;
          rating_cache: number | null;
          review_count: number;
          slug: string;
          state: string | null;
          type: Database["public"]["Enums"]["college_type"] | null;
          updated_at: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          city?: string | null;
          created_at?: string;
          email_domains?: string[];
          fee_max?: number | null;
          fee_min?: number | null;
          id?: string;
          name: string;
          nirf_rank?: number | null;
          rating_cache?: number | null;
          review_count?: number;
          slug: string;
          state?: string | null;
          type?: Database["public"]["Enums"]["college_type"] | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          email_domains?: string[];
          fee_max?: number | null;
          fee_min?: number | null;
          id?: string;
          name?: string;
          nirf_rank?: number | null;
          rating_cache?: number | null;
          review_count?: number;
          slug?: string;
          state?: string | null;
          type?: Database["public"]["Enums"]["college_type"] | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          body: string;
          created_at: string;
          depth: number;
          id: string;
          parent_id: string | null;
          post_id: string;
          score: number;
          status: Database["public"]["Enums"]["content_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          depth?: number;
          id?: string;
          parent_id?: string | null;
          post_id: string;
          score?: number;
          status?: Database["public"]["Enums"]["content_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          depth?: number;
          id?: string;
          parent_id?: string | null;
          post_id?: string;
          score?: number;
          status?: Database["public"]["Enums"]["content_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          college_id: string;
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          college_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          college_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_college_id_fkey";
            columns: ["college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mod_actions: {
        Row: {
          action: Database["public"]["Enums"]["mod_action_type"];
          created_at: string;
          id: string;
          moderator_id: string;
          note: string | null;
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target_type"];
        };
        ComputedFields: never;
        Insert: {
          action: Database["public"]["Enums"]["mod_action_type"];
          created_at?: string;
          id?: string;
          moderator_id: string;
          note?: string | null;
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target_type"];
        };
        Update: {
          action?: Database["public"]["Enums"]["mod_action_type"];
          created_at?: string;
          id?: string;
          moderator_id?: string;
          note?: string | null;
          target_id?: string;
          target_type?: Database["public"]["Enums"]["report_target_type"];
        };
        Relationships: [
          {
            foreignKeyName: "mod_actions_moderator_id_fkey";
            columns: ["moderator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          read_at: string | null;
          target_id: string;
          target_type: Database["public"]["Enums"]["notification_target_type"];
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          read_at?: string | null;
          target_id: string;
          target_type: Database["public"]["Enums"]["notification_target_type"];
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          read_at?: string | null;
          target_id?: string;
          target_type?: Database["public"]["Enums"]["notification_target_type"];
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      placement_reports: {
        Row: {
          branch: string;
          college_id: string;
          created_at: string;
          id: string;
          median_lpa: number;
          offers_count: number | null;
          status: Database["public"]["Enums"]["content_status"];
          user_id: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          branch: string;
          college_id: string;
          created_at?: string;
          id?: string;
          median_lpa: number;
          offers_count?: number | null;
          status?: Database["public"]["Enums"]["content_status"];
          user_id: string;
          year: number;
        };
        Update: {
          branch?: string;
          college_id?: string;
          created_at?: string;
          id?: string;
          median_lpa?: number;
          offers_count?: number | null;
          status?: Database["public"]["Enums"]["content_status"];
          user_id?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "placement_reports_college_id_fkey";
            columns: ["college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "placement_reports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          accepted_comment_id: string | null;
          body: string;
          college_id: string;
          comment_count: number;
          created_at: string;
          flair: Database["public"]["Enums"]["post_flair"];
          id: string;
          score: number;
          status: Database["public"]["Enums"]["content_status"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_comment_id?: string | null;
          body?: string;
          college_id: string;
          comment_count?: number;
          created_at?: string;
          flair?: Database["public"]["Enums"]["post_flair"];
          id?: string;
          score?: number;
          status?: Database["public"]["Enums"]["content_status"];
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accepted_comment_id?: string | null;
          body?: string;
          college_id?: string;
          comment_count?: number;
          created_at?: string;
          flair?: Database["public"]["Enums"]["post_flair"];
          id?: string;
          score?: number;
          status?: Database["public"]["Enums"]["content_status"];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_accepted_comment_fkey";
            columns: ["accepted_comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_college_id_fkey";
            columns: ["college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: string;
          reporter_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target_type"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: string;
          reporter_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target_type"];
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: string;
          reporter_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          target_id?: string;
          target_type?: Database["public"]["Enums"]["report_target_type"];
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          academics: number;
          batch_year: number | null;
          best_for: string | null;
          branch: string | null;
          campus_hostel: number;
          campus_life: number;
          college_id: string;
          cons: string;
          created_at: string;
          faculty: number;
          helpful_count: number;
          id: string;
          is_verified: boolean;
          not_for: string | null;
          placements: number;
          pros: string;
          status: Database["public"]["Enums"]["content_status"];
          title: string;
          updated_at: string;
          user_id: string;
          value_for_money: number;
          would_choose_again: boolean;
        };
        ComputedFields: never;
        Insert: {
          academics: number;
          batch_year?: number | null;
          best_for?: string | null;
          branch?: string | null;
          campus_hostel: number;
          campus_life: number;
          college_id: string;
          cons: string;
          created_at?: string;
          faculty: number;
          helpful_count?: number;
          id?: string;
          is_verified?: boolean;
          not_for?: string | null;
          placements: number;
          pros: string;
          status?: Database["public"]["Enums"]["content_status"];
          title: string;
          updated_at?: string;
          user_id: string;
          value_for_money: number;
          would_choose_again: boolean;
        };
        Update: {
          academics?: number;
          batch_year?: number | null;
          best_for?: string | null;
          branch?: string | null;
          campus_hostel?: number;
          campus_life?: number;
          college_id?: string;
          cons?: string;
          created_at?: string;
          faculty?: number;
          helpful_count?: number;
          id?: string;
          is_verified?: boolean;
          not_for?: string | null;
          placements?: number;
          pros?: string;
          status?: Database["public"]["Enums"]["content_status"];
          title?: string;
          updated_at?: string;
          user_id?: string;
          value_for_money?: number;
          would_choose_again?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_college_id_fkey";
            columns: ["college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          handle: string;
          id: string;
          karma: number;
          role: Database["public"]["Enums"]["user_role"];
          status: Database["public"]["Enums"]["content_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          handle: string;
          id: string;
          karma?: number;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["content_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          handle?: string;
          id?: string;
          karma?: number;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["content_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      verifications: {
        Row: {
          batch_year: number | null;
          branch: string | null;
          college_id: string;
          created_at: string;
          email_hash: string | null;
          id: string;
          id_document_path: string | null;
          kind: Database["public"]["Enums"]["verification_kind"];
          method: Database["public"]["Enums"]["verification_method"];
          status: Database["public"]["Enums"]["verification_status"];
          user_id: string;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          batch_year?: number | null;
          branch?: string | null;
          college_id: string;
          created_at?: string;
          email_hash?: string | null;
          id?: string;
          id_document_path?: string | null;
          kind: Database["public"]["Enums"]["verification_kind"];
          method: Database["public"]["Enums"]["verification_method"];
          status?: Database["public"]["Enums"]["verification_status"];
          user_id: string;
          verified_at?: string | null;
        };
        Update: {
          batch_year?: number | null;
          branch?: string | null;
          college_id?: string;
          created_at?: string;
          email_hash?: string | null;
          id?: string;
          id_document_path?: string | null;
          kind?: Database["public"]["Enums"]["verification_kind"];
          method?: Database["public"]["Enums"]["verification_method"];
          status?: Database["public"]["Enums"]["verification_status"];
          user_id?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "verifications_college_id_fkey";
            columns: ["college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      votes: {
        Row: {
          created_at: string;
          id: string;
          target_id: string;
          target_type: Database["public"]["Enums"]["vote_target_type"];
          user_id: string;
          value: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          target_id: string;
          target_type: Database["public"]["Enums"]["vote_target_type"];
          user_id: string;
          value?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          target_id?: string;
          target_type?: Database["public"]["Enums"]["vote_target_type"];
          user_id?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_approved_verification: {
        Args: { p_college_id: string };
        Returns: boolean;
      };
      is_moderator: { Args: Record<PropertyKey, never>; Returns: boolean };
      own_login_email_hash: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      college_type: "government" | "private";
      content_status: "visible" | "hidden" | "removed";
      mod_action_type:
        | "hide"
        | "unhide"
        | "remove"
        | "restore"
        | "ban"
        | "unban"
        | "approve_verification"
        | "reject_verification"
        | "edit_college"
        | "dismiss_report";
      notification_target_type:
        "post" | "comment" | "review" | "verification" | "user";
      notification_type:
        | "reply"
        | "answer"
        | "helpful_vote"
        | "verification_approved"
        | "moderation";
      post_flair: "question" | "discussion" | "advice" | "event";
      report_status: "open" | "resolved" | "dismissed";
      report_target_type:
        "post" | "comment" | "review" | "placement_report" | "user";
      user_role: "member" | "moderator" | "admin";
      verification_kind: "student" | "alumni";
      verification_method: "email" | "id";
      verification_status: "pending" | "approved" | "rejected" | "revoked";
      vote_target_type: "post" | "comment" | "review";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      college_type: ["government", "private"],
      content_status: ["visible", "hidden", "removed"],
      mod_action_type: [
        "hide",
        "unhide",
        "remove",
        "restore",
        "ban",
        "unban",
        "approve_verification",
        "reject_verification",
        "edit_college",
        "dismiss_report",
      ],
      notification_target_type: [
        "post",
        "comment",
        "review",
        "verification",
        "user",
      ],
      notification_type: [
        "reply",
        "answer",
        "helpful_vote",
        "verification_approved",
        "moderation",
      ],
      post_flair: ["question", "discussion", "advice", "event"],
      report_status: ["open", "resolved", "dismissed"],
      report_target_type: [
        "post",
        "comment",
        "review",
        "placement_report",
        "user",
      ],
      user_role: ["member", "moderator", "admin"],
      verification_kind: ["student", "alumni"],
      verification_method: ["email", "id"],
      verification_status: ["pending", "approved", "rejected", "revoked"],
      vote_target_type: ["post", "comment", "review"],
    },
  },
} as const;
