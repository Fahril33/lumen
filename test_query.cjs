const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envVars = fs.readFileSync('.env', 'utf8').split('\n');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envVars) {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const { data, error } = await supabase.from('chat_messages').select('*, reply_to:chat_messages!reply_to_id(*)').limit(1);
  console.log('Error?', error);
  console.log('Data?', JSON.stringify(data, null, 2));
}

testQuery();
