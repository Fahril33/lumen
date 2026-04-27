import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function fixCycles() {
  const { data: folders, error } = await supabase.from('folders').select('id, name, parent_id');
  if (error) {
    console.error('Error fetching folders:', error);
    return;
  }

  const folderMap = new Map();
  folders.forEach(f => folderMap.set(f.id, f));

  let fixedCount = 0;

  for (const folder of folders) {
    if (folder.parent_id && !folderMap.has(folder.parent_id)) {
      console.log(`Orphaned folder detected: ${folder.name} (${folder.id}). Resetting parent_id to null.`);
      const { error: updateError } = await supabase
        .from('folders')
        .update({ parent_id: null })
        .eq('id', folder.id);
      
      if (!updateError) {
        folderMap.get(folder.id).parent_id = null;
        fixedCount++;
      }
    } else {
      let currentId = folder.parent_id;
      let visited = new Set();
      visited.add(folder.id);
      let cycleFound = false;

      while (currentId) {
        if (visited.has(currentId)) {
          cycleFound = true;
          break;
        }
        visited.add(currentId);
        const parent = folderMap.get(currentId);
        currentId = parent ? parent.parent_id : null;
      }

      if (cycleFound) {
        console.log(`Cycle detected for folder ${folder.name} (${folder.id}). Resetting parent_id to null.`);
        const { error: updateError } = await supabase
          .from('folders')
          .update({ parent_id: null })
          .eq('id', folder.id);
        
        if (!updateError) {
          folderMap.get(folder.id).parent_id = null;
          fixedCount++;
        }
      }
    }
  }

  // Also check orphaned notes
  const { data: notes } = await supabase.from('notes').select('id, title, folder_id');
  let fixedNotes = 0;
  if (notes) {
    for (const note of notes) {
      if (note.folder_id && !folderMap.has(note.folder_id)) {
        console.log(`Orphaned note detected: ${note.title} (${note.id}). Resetting folder_id to null.`);
        await supabase.from('notes').update({ folder_id: null }).eq('id', note.id);
        fixedNotes++;
      }
    }
  }

  console.log(`Finished checking. Fixed ${fixedCount} folders and ${fixedNotes} notes.`);
}

fixCycles();
