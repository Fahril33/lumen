const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) acc[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('chat_messages').select('*, profiles!user_id(*), reply_to:chat_messages!reply_to_id(*, profiles!user_id(*))').limit(1);
  console.log('Query with !user_id hint:', error ? error.message : 'SUCCESS', data);
  
  const { data: d2, error: e2 } = await supabase.from('chat_messages').select('*, profiles(*), reply_to:chat_messages!reply_to_id(*)').limit(1);
  console.log('Query with profiles(*) top level only:', e2 ? e2.message : 'SUCCESS', d2);
}
run();
