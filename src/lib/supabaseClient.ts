// @ts-ignore
import { createClient } from "@supabase/supabase-js";

// Replace these strings with your actual Supabase Project URL and Anon Key
// You can find these in your Supabase Dashboard under Settings -> API
const supabaseUrl = "https://thxffjrlbqvuazvxqzhj.supabase.co";
const supabaseAnonKey = "sb_publishable_05qpMoFwcqKlhZSOFs4Tig_ZCFFxs4O";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);