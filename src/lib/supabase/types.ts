// Types generados desde la BD vía Supabase MCP `generate_typescript_types`.
// Regenerar con:  supabase gen types typescript --project-id rljipcoquotezyappziy

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      academias: {
        Row: {
          active: boolean;
          api_base_url: string;
          base_url: string;
          created_at: string;
          id: string;
          label: string;
          slug: string;
          storefront_url: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          api_base_url: string;
          base_url: string;
          created_at?: string;
          id?: string;
          label: string;
          slug: string;
          storefront_url?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          api_base_url?: string;
          base_url?: string;
          created_at?: string;
          id?: string;
          label?: string;
          slug?: string;
          storefront_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      api_keys: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          key_hash: string;
          label: string;
          last_used_at: string | null;
          prefix: string;
          revoked_at: string | null;
          scopes: string[];
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          key_hash: string;
          label: string;
          last_used_at?: string | null;
          prefix: string;
          revoked_at?: string | null;
          scopes?: string[];
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          key_hash?: string;
          label?: string;
          last_used_at?: string | null;
          prefix?: string;
          revoked_at?: string | null;
          scopes?: string[];
        };
        Relationships: [];
      };
      console_errors: {
        Row: {
          captured_at: string;
          crawl_id: string;
          id: string;
          level: string;
          message: string;
          pagina_id: string | null;
          source: string | null;
        };
        Insert: {
          captured_at?: string;
          crawl_id: string;
          id?: string;
          level: string;
          message: string;
          pagina_id?: string | null;
          source?: string | null;
        };
        Update: {
          captured_at?: string;
          crawl_id?: string;
          id?: string;
          level?: string;
          message?: string;
          pagina_id?: string | null;
          source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "console_errors_crawl_id_fkey";
            columns: ["crawl_id"];
            isOneToOne: false;
            referencedRelation: "crawls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "console_errors_pagina_id_fkey";
            columns: ["pagina_id"];
            isOneToOne: false;
            referencedRelation: "paginas";
            referencedColumns: ["id"];
          },
        ];
      };
      crawls: {
        Row: {
          academia_id: string;
          duration_ms: number | null;
          ended_at: string | null;
          error_message: string | null;
          error_stack: string | null;
          gh_run_id: number | null;
          id: string;
          metadata: Json | null;
          pages_changed: number;
          pages_failed: number;
          pages_success: number;
          pages_total: number;
          pages_unchanged: number;
          started_at: string;
          status: Database["public"]["Enums"]["crawl_status"];
          trigger: string;
          triggered_by: string | null;
        };
        Insert: {
          academia_id: string;
          duration_ms?: number | null;
          ended_at?: string | null;
          error_message?: string | null;
          error_stack?: string | null;
          gh_run_id?: number | null;
          id?: string;
          metadata?: Json | null;
          pages_changed?: number;
          pages_failed?: number;
          pages_success?: number;
          pages_total?: number;
          pages_unchanged?: number;
          started_at?: string;
          status?: Database["public"]["Enums"]["crawl_status"];
          trigger: string;
          triggered_by?: string | null;
        };
        Update: {
          academia_id?: string;
          duration_ms?: number | null;
          ended_at?: string | null;
          error_message?: string | null;
          error_stack?: string | null;
          gh_run_id?: number | null;
          id?: string;
          metadata?: Json | null;
          pages_changed?: number;
          pages_failed?: number;
          pages_success?: number;
          pages_total?: number;
          pages_unchanged?: number;
          started_at?: string;
          status?: Database["public"]["Enums"]["crawl_status"];
          trigger?: string;
          triggered_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "crawls_academia_id_fkey";
            columns: ["academia_id"];
            isOneToOne: false;
            referencedRelation: "academias";
            referencedColumns: ["id"];
          },
        ];
      };
      credenciales: {
        Row: {
          academia_id: string;
          created_at: string;
          email: string;
          id: string;
          label: string | null;
          last_used_at: string | null;
          password_encrypted: string;
          role: string | null;
        };
        Insert: {
          academia_id: string;
          created_at?: string;
          email: string;
          id?: string;
          label?: string | null;
          last_used_at?: string | null;
          password_encrypted: string;
          role?: string | null;
        };
        Update: {
          academia_id?: string;
          created_at?: string;
          email?: string;
          id?: string;
          label?: string | null;
          last_used_at?: string | null;
          password_encrypted?: string;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "credenciales_academia_id_fkey";
            columns: ["academia_id"];
            isOneToOne: false;
            referencedRelation: "academias";
            referencedColumns: ["id"];
          },
        ];
      };
      paginas: {
        Row: {
          captured_at: string;
          changed: boolean;
          content_hash: string | null;
          crawl_id: string;
          dom_tree_path: string | null;
          duration_ms: number | null;
          error_message: string | null;
          forms_count: number;
          full_url: string;
          html_path: string | null;
          http_status: number;
          id: string;
          links_count: number;
          path: string;
          route_name: string | null;
          screenshot_path: string | null;
          text_content: string | null;
          title: string | null;
        };
        Insert: {
          captured_at?: string;
          changed?: boolean;
          content_hash?: string | null;
          crawl_id: string;
          dom_tree_path?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          forms_count?: number;
          full_url: string;
          html_path?: string | null;
          http_status: number;
          id?: string;
          links_count?: number;
          path: string;
          route_name?: string | null;
          screenshot_path?: string | null;
          text_content?: string | null;
          title?: string | null;
        };
        Update: {
          captured_at?: string;
          changed?: boolean;
          content_hash?: string | null;
          crawl_id?: string;
          dom_tree_path?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          forms_count?: number;
          full_url?: string;
          html_path?: string | null;
          http_status?: number;
          id?: string;
          links_count?: number;
          path?: string;
          route_name?: string | null;
          screenshot_path?: string | null;
          text_content?: string | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "paginas_crawl_id_fkey";
            columns: ["crawl_id"];
            isOneToOne: false;
            referencedRelation: "crawls";
            referencedColumns: ["id"];
          },
        ];
      };
      documentos: {
        Row: {
          id: string;
          academia_id: string;
          source: "notes" | "normalizer";
          slug: string;
          titulo: string;
          area: string | null;
          source_path: string | null;
          pagina_id: string | null;
          crawl_id: string | null;
          content_md: string;
          orden: number;
          tokens: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          academia_id: string;
          source?: "notes" | "normalizer";
          slug: string;
          titulo: string;
          area?: string | null;
          source_path?: string | null;
          pagina_id?: string | null;
          crawl_id?: string | null;
          content_md: string;
          orden?: number;
          tokens?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          academia_id?: string;
          source?: "notes" | "normalizer";
          slug?: string;
          titulo?: string;
          area?: string | null;
          source_path?: string | null;
          pagina_id?: string | null;
          crawl_id?: string | null;
          content_md?: string;
          orden?: number;
          tokens?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documentos_academia_id_fkey";
            columns: ["academia_id"];
            isOneToOne: false;
            referencedRelation: "academias";
            referencedColumns: ["id"];
          },
        ];
      };
      conversaciones: {
        Row: {
          id: string;
          session_id: string;
          messages: Json;
          ip_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          messages?: Json;
          ip_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          messages?: Json;
          ip_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rutas: {
        Row: {
          academia_id: string;
          first_seen_at: string;
          id: string;
          is_dynamic: boolean;
          last_seen_at: string;
          last_seen_crawl_id: string | null;
          meta: Json | null;
          path_pattern: string;
          route_name: string;
        };
        Insert: {
          academia_id: string;
          first_seen_at?: string;
          id?: string;
          is_dynamic: boolean;
          last_seen_at?: string;
          last_seen_crawl_id?: string | null;
          meta?: Json | null;
          path_pattern: string;
          route_name: string;
        };
        Update: {
          academia_id?: string;
          first_seen_at?: string;
          id?: string;
          is_dynamic?: boolean;
          last_seen_at?: string;
          last_seen_crawl_id?: string | null;
          meta?: Json | null;
          path_pattern?: string;
          route_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rutas_academia_id_fkey";
            columns: ["academia_id"];
            isOneToOne: false;
            referencedRelation: "academias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rutas_last_seen_crawl_id_fkey";
            columns: ["last_seen_crawl_id"];
            isOneToOne: false;
            referencedRelation: "crawls";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      crawl_status: "pending" | "running" | "completed" | "failed" | "partial" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};
