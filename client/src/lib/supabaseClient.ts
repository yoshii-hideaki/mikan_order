import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Realtime用クライアント。環境変数が未設定（Render環境）の場合は null。
export const supabase = url && key ? createClient(url, key) : null;
