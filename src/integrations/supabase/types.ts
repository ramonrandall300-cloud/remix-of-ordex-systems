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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          org_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          org_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          org_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cell_cultures: {
        Row: {
          cell_line: string
          co2_percent: number
          created_at: string
          humidity: number
          id: string
          medium: string
          name: string
          notes: string | null
          org_id: string
          passage_number: number
          seeding_density: string | null
          status: string
          temperature: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cell_line?: string
          co2_percent?: number
          created_at?: string
          humidity?: number
          id?: string
          medium?: string
          name: string
          notes?: string | null
          org_id: string
          passage_number?: number
          seeding_density?: string | null
          status?: string
          temperature?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cell_line?: string
          co2_percent?: number
          created_at?: string
          humidity?: number
          id?: string
          medium?: string
          name?: string
          notes?: string | null
          org_id?: string
          passage_number?: number
          seeding_density?: string | null
          status?: string
          temperature?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          balance: number
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      crispr_edit_logs: {
        Row: {
          attachments: Json | null
          content: string | null
          created_at: string
          experiment_id: string
          guide_design_id: string | null
          id: string
          log_type: string
          metrics: Json | null
          title: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content?: string | null
          created_at?: string
          experiment_id: string
          guide_design_id?: string | null
          id?: string
          log_type?: string
          metrics?: Json | null
          title: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string | null
          created_at?: string
          experiment_id?: string
          guide_design_id?: string | null
          id?: string
          log_type?: string
          metrics?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crispr_edit_logs_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "crispr_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crispr_edit_logs_guide_design_id_fkey"
            columns: ["guide_design_id"]
            isOneToOne: false
            referencedRelation: "crispr_guide_designs"
            referencedColumns: ["id"]
          },
        ]
      }
      crispr_experiments: {
        Row: {
          cas_variant: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          name: string
          organism: string
          status: string
          target_gene: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cas_variant?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          name: string
          organism?: string
          status?: string
          target_gene?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cas_variant?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          name?: string
          organism?: string
          status?: string
          target_gene?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crispr_guide_designs: {
        Row: {
          chromosome: string | null
          created_at: string
          efficiency_score: number | null
          experiment_id: string
          guide_sequence: string
          id: string
          off_target_results: Json | null
          pam_sequence: string
          position: number | null
          risk_assessment: string | null
          specificity_score: number | null
          status: string
          strand: string | null
          user_id: string
          version: number
        }
        Insert: {
          chromosome?: string | null
          created_at?: string
          efficiency_score?: number | null
          experiment_id: string
          guide_sequence: string
          id?: string
          off_target_results?: Json | null
          pam_sequence?: string
          position?: number | null
          risk_assessment?: string | null
          specificity_score?: number | null
          status?: string
          strand?: string | null
          user_id: string
          version?: number
        }
        Update: {
          chromosome?: string | null
          created_at?: string
          efficiency_score?: number | null
          experiment_id?: string
          guide_sequence?: string
          id?: string
          off_target_results?: Json | null
          pam_sequence?: string
          position?: number | null
          risk_assessment?: string | null
          specificity_score?: number | null
          status?: string
          strand?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "crispr_guide_designs_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "crispr_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      culture_ai_analyses: {
        Row: {
          analysis_type: string
          created_at: string
          credits_cost: number
          culture_id: string
          id: string
          model_used: string
          result: Json
          user_id: string
        }
        Insert: {
          analysis_type: string
          created_at?: string
          credits_cost?: number
          culture_id: string
          id?: string
          model_used?: string
          result?: Json
          user_id: string
        }
        Update: {
          analysis_type?: string
          created_at?: string
          credits_cost?: number
          culture_id?: string
          id?: string
          model_used?: string
          result?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "culture_ai_analyses_culture_id_fkey"
            columns: ["culture_id"]
            isOneToOne: false
            referencedRelation: "cell_cultures"
            referencedColumns: ["id"]
          },
        ]
      }
      culture_logs: {
        Row: {
          cell_count: number | null
          confluence_percent: number | null
          created_at: string
          culture_id: string
          glucose_level: number | null
          id: string
          lactate_level: number | null
          logged_at: string
          morphology_notes: string | null
          ph: number | null
          user_id: string
          viability_percent: number | null
        }
        Insert: {
          cell_count?: number | null
          confluence_percent?: number | null
          created_at?: string
          culture_id: string
          glucose_level?: number | null
          id?: string
          lactate_level?: number | null
          logged_at?: string
          morphology_notes?: string | null
          ph?: number | null
          user_id: string
          viability_percent?: number | null
        }
        Update: {
          cell_count?: number | null
          confluence_percent?: number | null
          created_at?: string
          culture_id?: string
          glucose_level?: number | null
          id?: string
          lactate_level?: number | null
          logged_at?: string
          morphology_notes?: string | null
          ph?: number | null
          user_id?: string
          viability_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "culture_logs_culture_id_fkey"
            columns: ["culture_id"]
            isOneToOne: false
            referencedRelation: "cell_cultures"
            referencedColumns: ["id"]
          },
        ]
      }
      docking_jobs: {
        Row: {
          best_score: number | null
          binding_site: string
          created_at: string
          engine: string
          error_message: string | null
          estimated_credits: number
          eta: string | null
          expires_at: string | null
          gpu_type: string
          id: string
          job_number: number
          ligand_file_url: string | null
          ligand_mode: string
          ligands: string
          poses: Json | null
          priority: string
          progress: number
          receptor: string
          receptor_file_url: string | null
          retry_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          best_score?: number | null
          binding_site?: string
          created_at?: string
          engine?: string
          error_message?: string | null
          estimated_credits?: number
          eta?: string | null
          expires_at?: string | null
          gpu_type?: string
          id?: string
          job_number?: number
          ligand_file_url?: string | null
          ligand_mode?: string
          ligands: string
          poses?: Json | null
          priority?: string
          progress?: number
          receptor: string
          receptor_file_url?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          best_score?: number | null
          binding_site?: string
          created_at?: string
          engine?: string
          error_message?: string | null
          estimated_credits?: number
          eta?: string | null
          expires_at?: string | null
          gpu_type?: string
          id?: string
          job_number?: number
          ligand_file_url?: string | null
          ligand_mode?: string
          ligands?: string
          poses?: Json | null
          priority?: string
          progress?: number
          receptor?: string
          receptor_file_url?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      gpu_snapshots: {
        Row: {
          avg_utilization: number
          id: string
          online_gpus: number
          org_id: string
          queued_jobs: number
          recorded_at: string
          total_gpus: number
        }
        Insert: {
          avg_utilization?: number
          id?: string
          online_gpus?: number
          org_id: string
          queued_jobs?: number
          recorded_at?: string
          total_gpus?: number
        }
        Update: {
          avg_utilization?: number
          id?: string
          online_gpus?: number
          org_id?: string
          queued_jobs?: number
          recorded_at?: string
          total_gpus?: number
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string
          created_by: string | null
          credits_cost: number
          id: string
          input: Json | null
          org_id: string
          output: Json | null
          payload: Json | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credits_cost?: number
          id?: string
          input?: Json | null
          org_id: string
          output?: Json | null
          payload?: Json | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credits_cost?: number
          id?: string
          input?: Json | null
          org_id?: string
          output?: Json | null
          payload?: Json | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      org_credits: {
        Row: {
          balance: number
          org_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          org_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_credits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          org_id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          org_id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          file_path: string | null
          file_type: string
          id: string
          name: string
          project_id: string
          size_bytes: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          file_type?: string
          id?: string
          name: string
          project_id: string
          size_bytes?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          file_type?: string
          id?: string
          name?: string
          project_id?: string
          size_bytes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      protein_prediction_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          estimated_credits: number
          eta: string | null
          expires_at: string | null
          gpu_type: string
          id: string
          job_number: number
          model: string
          name: string
          plddt_binding_domain: number | null
          plddt_score: number | null
          priority: string
          progress: number
          result_metrics: Json | null
          result_pdb_url: string | null
          retry_count: number
          sequence: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          estimated_credits?: number
          eta?: string | null
          expires_at?: string | null
          gpu_type?: string
          id?: string
          job_number?: number
          model?: string
          name: string
          plddt_binding_domain?: number | null
          plddt_score?: number | null
          priority?: string
          progress?: number
          result_metrics?: Json | null
          result_pdb_url?: string | null
          retry_count?: number
          sequence: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          estimated_credits?: number
          eta?: string | null
          expires_at?: string | null
          gpu_type?: string
          id?: string
          job_number?: number
          model?: string
          name?: string
          plddt_binding_domain?: number | null
          plddt_score?: number | null
          priority?: string
          progress?: number
          result_metrics?: Json | null
          result_pdb_url?: string | null
          retry_count?: number
          sequence?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      structure_annotations: {
        Row: {
          chain: string | null
          color: string
          created_at: string
          id: string
          note: string
          pdb_id: string
          position_x: number | null
          position_y: number | null
          position_z: number | null
          residue_name: string | null
          residue_number: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chain?: string | null
          color?: string
          created_at?: string
          id?: string
          note?: string
          pdb_id: string
          position_x?: number | null
          position_y?: number | null
          position_z?: number | null
          residue_name?: string | null
          residue_number?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chain?: string | null
          color?: string
          created_at?: string
          id?: string
          note?: string
          pdb_id?: string
          position_x?: number | null
          position_y?: number | null
          position_z?: number | null
          residue_name?: string | null
          residue_number?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_cache: {
        Row: {
          org_id: string
          retention_days: number
          seat_count: number
          seat_price: number
          subscription_end: string | null
          subscription_id: string | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          org_id: string
          retention_days?: number
          seat_count?: number
          seat_price?: number
          subscription_end?: string | null
          subscription_id?: string | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          org_id?: string
          retention_days?: number
          seat_count?: number
          seat_price?: number
          subscription_end?: string | null
          subscription_id?: string | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cache_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cache_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cache_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      synbio_designs: {
        Row: {
          assembly_method: string
          cai_score: number | null
          created_at: string
          expires_at: string | null
          feasibility_score: number | null
          features: Json | null
          gc_content: number | null
          host_organism: string
          id: string
          name: string
          optimization_organism: string
          plasmid_type: string
          sequence: string
          sequence_type: string
          updated_at: string
          user_id: string
          validation_result: Json | null
        }
        Insert: {
          assembly_method?: string
          cai_score?: number | null
          created_at?: string
          expires_at?: string | null
          feasibility_score?: number | null
          features?: Json | null
          gc_content?: number | null
          host_organism?: string
          id?: string
          name: string
          optimization_organism?: string
          plasmid_type?: string
          sequence: string
          sequence_type?: string
          updated_at?: string
          user_id: string
          validation_result?: Json | null
        }
        Update: {
          assembly_method?: string
          cai_score?: number | null
          created_at?: string
          expires_at?: string | null
          feasibility_score?: number | null
          features?: Json | null
          gc_content?: number | null
          host_organism?: string
          id?: string
          name?: string
          optimization_organism?: string
          plasmid_type?: string
          sequence?: string
          sequence_type?: string
          updated_at?: string
          user_id?: string
          validation_result?: Json | null
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          credits_used: number
          description: string | null
          id: string
          job_id: string | null
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number
          description?: string | null
          id?: string
          job_id?: string | null
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          description?: string | null
          id?: string
          job_id?: string | null
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          device_info: string | null
          ip_address: string | null
          last_seen_at: string
          session_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          device_info?: string | null
          ip_address?: string | null
          last_seen_at?: string
          session_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          device_info?: string | null
          ip_address?: string | null
          last_seen_at?: string
          session_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      viewer_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          pdb_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          pdb_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          pdb_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      organizations_public: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      organizations_safe: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_credits: {
        Args: { _amount: number; _org_id: string }
        Returns: number
      }
      cleanup_expired_results: { Args: never; Returns: number }
      create_notification: {
        Args: {
          _body?: string
          _metadata?: Json
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: string
      }
      deduct_credits_for_job: {
        Args: { _cost: number; _org_id: string }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_organization: { Args: { _org_id: string }; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_org_members_with_profile: {
        Args: { _org_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
          user_id: string
        }[]
      }
      get_user_orgs: {
        Args: never
        Returns: {
          created_at: string | null
          id: string | null
          name: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "organizations_public"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          _action: string
          _details?: Json
          _entity_id?: string
          _entity_type?: string
          _ip_address?: string
          _org_id?: string
          _user_id: string
        }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      register_session: {
        Args: { _device_info?: string; _session_id: string }
        Returns: Json
      }
      upsert_subscription_cache:
        | {
            Args: {
              _org_id: string
              _seat_count: number
              _seat_price: number
              _subscription_end: string
              _subscription_id: string
              _tier: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _org_id: string
              _retention_days?: number
              _seat_count: number
              _seat_price: number
              _subscription_end: string
              _subscription_id: string
              _tier: string
            }
            Returns: undefined
          }
      user_org_id: { Args: { _user_id: string }; Returns: string }
      validate_session: { Args: { _session_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
