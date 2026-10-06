import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://vglkhiuxwpshawilqogq.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_-MsQkDsRAluqNYr5fC_CjA_ylvQXUbD";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Story {
  id: string;
  image_data: string;
  created_at: string;
  caption?: string | null;
  location?: string | null;
  music_title?: string | null;
  music_url?: string | null;
  link_url?: string | null;
  expires_at?: string | null;
}
