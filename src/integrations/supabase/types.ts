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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          file_path: string
          file_size: number | null
          file_type: string
          filename: string
          id: string
          remark_id: string | null
          uploaded_by: string | null
          work_id: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size?: number | null
          file_type: string
          filename: string
          id?: string
          remark_id?: string | null
          uploaded_by?: string | null
          work_id?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          filename?: string
          id?: string
          remark_id?: string | null
          uploaded_by?: string | null
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_remark_id_fkey"
            columns: ["remark_id"]
            isOneToOne: false
            referencedRelation: "remarks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          active: boolean
          created_at: string
          division_id: string | null
          email: string
          id: string
          name: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          division_id?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          division_id?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      org_hierarchy: {
        Row: {
          created_at: string
          employee_id: string | null
          id: string
          position_name: string
          position_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          id?: string
          position_name: string
          position_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          id?: string
          position_name?: string
          position_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_hierarchy_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      remarks: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          text: string
          work_id: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          text: string
          work_id: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          text?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remarks_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remarks_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          title: string
          updated_at: string
          work_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title: string
          updated_at?: string
          work_id: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title?: string
          updated_at?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      third_party_contractors: {
        Row: {
          aadhar_number: string | null
          address: string | null
          age: number | null
          category: string
          created_at: string
          email: string | null
          gender: string | null
          id: string
          mobile: string | null
          name: string
          pan_number: string | null
          qualification: string | null
          ub_id: string
          updated_at: string
        }
        Insert: {
          aadhar_number?: string | null
          address?: string | null
          age?: number | null
          category?: string
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          mobile?: string | null
          name: string
          pan_number?: string | null
          qualification?: string | null
          ub_id: string
          updated_at?: string
        }
        Update: {
          aadhar_number?: string | null
          address?: string | null
          age?: number | null
          category?: string
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          mobile?: string | null
          name?: string
          pan_number?: string | null
          qualification?: string | null
          ub_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      third_party_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_date: string
          payment_mode: string
          remarks: string | null
          stage_name: string
          stage_number: number
          transaction_ref: string | null
          work_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_date?: string
          payment_mode: string
          remarks?: string | null
          stage_name: string
          stage_number: number
          transaction_ref?: string | null
          work_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_date?: string
          payment_mode?: string
          remarks?: string | null
          stage_name?: string
          stage_number?: number
          transaction_ref?: string | null
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "third_party_transactions_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "third_party_works"
            referencedColumns: ["id"]
          },
        ]
      }
      third_party_works: {
        Row: {
          client_name: string | null
          contractor_id: string
          created_at: string
          id: string
          qt_no: string
          quoted_amount: number
          sanction_amount: number
          stage_amount: number
          stage1_paid_at: string | null
          stage1_status: Database["public"]["Enums"]["payment_stage_status"]
          stage2_paid_at: string | null
          stage2_status: Database["public"]["Enums"]["payment_stage_status"]
          stage3_paid_at: string | null
          stage3_status: Database["public"]["Enums"]["payment_stage_status"]
          stage4_paid_at: string | null
          stage4_status: Database["public"]["Enums"]["payment_stage_status"]
          updated_at: string
          work_name: string
        }
        Insert: {
          client_name?: string | null
          contractor_id: string
          created_at?: string
          id?: string
          qt_no: string
          quoted_amount?: number
          sanction_amount?: number
          stage_amount?: number
          stage1_paid_at?: string | null
          stage1_status?: Database["public"]["Enums"]["payment_stage_status"]
          stage2_paid_at?: string | null
          stage2_status?: Database["public"]["Enums"]["payment_stage_status"]
          stage3_paid_at?: string | null
          stage3_status?: Database["public"]["Enums"]["payment_stage_status"]
          stage4_paid_at?: string | null
          stage4_status?: Database["public"]["Enums"]["payment_stage_status"]
          updated_at?: string
          work_name: string
        }
        Update: {
          client_name?: string | null
          contractor_id?: string
          created_at?: string
          id?: string
          qt_no?: string
          quoted_amount?: number
          sanction_amount?: number
          stage_amount?: number
          stage1_paid_at?: string | null
          stage1_status?: Database["public"]["Enums"]["payment_stage_status"]
          stage2_paid_at?: string | null
          stage2_status?: Database["public"]["Enums"]["payment_stage_status"]
          stage3_paid_at?: string | null
          stage3_status?: Database["public"]["Enums"]["payment_stage_status"]
          stage4_paid_at?: string | null
          stage4_status?: Database["public"]["Enums"]["payment_stage_status"]
          updated_at?: string
          work_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "third_party_works_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "third_party_contractors"
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      works: {
        Row: {
          assigned_to: string | null
          client_name: string | null
          consultancy_cost: number | null
          created_at: string
          division_id: string
          dpr_cost: number | null
          due_date: string | null
          id: string
          order_date: string | null
          order_no: string | null
          priority: Database["public"]["Enums"]["work_priority"]
          qtn_no: string | null
          remaining_payment: number | null
          remarks_summary: string | null
          sn_no: string
          start_date: string | null
          status: Database["public"]["Enums"]["work_status"]
          subcategory: string | null
          total_cost: number | null
          updated_at: string
          work_name: string
        }
        Insert: {
          assigned_to?: string | null
          client_name?: string | null
          consultancy_cost?: number | null
          created_at?: string
          division_id: string
          dpr_cost?: number | null
          due_date?: string | null
          id?: string
          order_date?: string | null
          order_no?: string | null
          priority?: Database["public"]["Enums"]["work_priority"]
          qtn_no?: string | null
          remaining_payment?: number | null
          remarks_summary?: string | null
          sn_no: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["work_status"]
          subcategory?: string | null
          total_cost?: number | null
          updated_at?: string
          work_name: string
        }
        Update: {
          assigned_to?: string | null
          client_name?: string | null
          consultancy_cost?: number | null
          created_at?: string
          division_id?: string
          dpr_cost?: number | null
          due_date?: string | null
          id?: string
          order_date?: string | null
          order_no?: string | null
          priority?: Database["public"]["Enums"]["work_priority"]
          qtn_no?: string | null
          remaining_payment?: number | null
          remarks_summary?: string | null
          sn_no?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["work_status"]
          subcategory?: string | null
          total_cost?: number | null
          updated_at?: string
          work_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "works_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "works_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
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
      is_authenticated_user: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff"
      payment_stage_status: "Locked" | "Due" | "Paid"
      work_priority: "High" | "Medium" | "Low"
      work_status: "Pipeline" | "In Progress" | "Review" | "Completed"
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
      app_role: ["admin", "manager", "staff"],
      payment_stage_status: ["Locked", "Due", "Paid"],
      work_priority: ["High", "Medium", "Low"],
      work_status: ["Pipeline", "In Progress", "Review", "Completed"],
    },
  },
} as const
