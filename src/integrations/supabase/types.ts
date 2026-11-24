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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          bolge_name: string
          id: number
          region_name: string
          share_token: string
          sheet_labels: Json
          updated_at: string
        }
        Insert: {
          bolge_name?: string
          id?: number
          region_name?: string
          share_token?: string
          sheet_labels?: Json
          updated_at?: string
        }
        Update: {
          bolge_name?: string
          id?: number
          region_name?: string
          share_token?: string
          sheet_labels?: Json
          updated_at?: string
        }
        Relationships: []
      }
      course_managers: {
        Row: {
          course_id: string
          created_at: string
          email: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          email: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_managers_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          group_leader: string
          group_level: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          group_leader?: string
          group_level?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          group_leader?: string
          group_level?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      error_types: {
        Row: {
          category: Database["public"]["Enums"]["error_category"]
          created_at: string
          deduction: number
          id: string
          max_deduction: number | null
          name: string
          repeat_deduction: number | null
          sort_order: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["error_category"]
          created_at?: string
          deduction?: number
          id?: string
          max_deduction?: number | null
          name: string
          repeat_deduction?: number | null
          sort_order?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["error_category"]
          created_at?: string
          deduction?: number
          id?: string
          max_deduction?: number | null
          name?: string
          repeat_deduction?: number | null
          sort_order?: number
        }
        Relationships: []
      }
      exam_results: {
        Row: {
          course_id: string
          exam_id: string
          ezber: number
          id: string
          ilmihal: number
          kiraat: number
          kiraat_errors: Json
          sheet_marks: Json
          siyer: number
          student_id: string
          tecvid_deduction: number
          total: number
          updated_at: string
        }
        Insert: {
          course_id: string
          exam_id: string
          ezber?: number
          id?: string
          ilmihal?: number
          kiraat?: number
          kiraat_errors?: Json
          sheet_marks?: Json
          siyer?: number
          student_id: string
          tecvid_deduction?: number
          total?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          exam_id?: string
          ezber?: number
          id?: string
          ilmihal?: number
          kiraat?: number
          kiraat_errors?: Json
          sheet_marks?: Json
          siyer?: number
          student_id?: string
          tecvid_deduction?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sheets: {
        Row: {
          course_id: string
          exam_date: string | null
          exam_id: string
          examiner: string
          ezber_topic_1: string
          ezber_topic_2: string
          kiraat_topic: string
          note_ezber: string
          note_genel: string
          note_ilmihal: string
          note_siyer: string
          note_yuzune: string
          updated_at: string
        }
        Insert: {
          course_id: string
          exam_date?: string | null
          exam_id: string
          examiner?: string
          ezber_topic_1?: string
          ezber_topic_2?: string
          kiraat_topic?: string
          note_ezber?: string
          note_genel?: string
          note_ilmihal?: string
          note_siyer?: string
          note_yuzune?: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          exam_date?: string | null
          exam_id?: string
          examiner?: string
          ezber_topic_1?: string
          ezber_topic_2?: string
          kiraat_topic?: string
          note_ezber?: string
          note_genel?: string
          note_ilmihal?: string
          note_siyer?: string
          note_yuzune?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sheets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sheets_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          exam_month: number
          exam_year: number
          id: string
        }
        Insert: {
          created_at?: string
          exam_month: number
          exam_year: number
          id?: string
        }
        Update: {
          created_at?: string
          exam_month?: number
          exam_year?: number
          id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          course_id: string
          created_at: string
          first_name: string
          id: string
          last_name: string
        }
        Insert: {
          course_id: string
          created_at?: string
          first_name: string
          id?: string
          last_name?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      managed_course_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "course_manager"
      error_category: "tecvid" | "harf" | "diger"
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
      app_role: ["admin", "course_manager"],
      error_category: ["tecvid", "harf", "diger"],
    },
  },
} as const
