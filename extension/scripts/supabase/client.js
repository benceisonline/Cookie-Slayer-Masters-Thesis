import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://xshxbrwkwovkoeysealn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-h41lQ_FPf3ltVuosZ5ySA_Y9k0096z';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);