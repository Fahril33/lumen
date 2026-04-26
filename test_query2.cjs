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
  const { data, error } = await supabase.from('chat_messages').select('id, reply_to_id, chat_messages!chat_messages_reply_to_id_fkey(id)').not('reply_to_id', 'is', null).limit(1);
  console.log('Error 1?', error);
  console.log('Data 1?', JSON.stringify(data, null, 2));

  const { data: data2, error: error2 } = await supabase.from('chat_messages').select('id, reply_to_id, parent:reply_to_id(*)').not('reply_to_id', 'is', null).limit(1);
  console.log('Error 2?', error2);
  console.log('Data 2?', JSON.stringify(data2, null, 2));

  const { data: data3, error: error3 } = await supabase.from('chat_messages').select('id, reply_to_id, parent:chat_messages!chat_messages_reply_to_id_fkey(*)').not('reply_to_id', 'is', null).limit(1);
  console.log('Error 3?', error3);
  console.log('Data 3?', JSON.stringify(data3, null, 2));
}

testQuery();
