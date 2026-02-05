import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveProject(project) {
  const { data, error } = await supabase
    .from('projects')
    .upsert(project)
    .select();
  return { data, error };
}

export async function saveMessage(message) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert(message);
  return { data, error };
}

export async function getProjectMessages(projectId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  return { data, error };
}
