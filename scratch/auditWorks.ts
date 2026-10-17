import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';

(async () => {
  try {
    const ids = [
      '74aa002f-6f98-4cc6-b1b6-b55d2f05f7c8',
      '11a0db19-36c4-4248-93d8-9fda9d0f1427',
      '5a68acae-a4dd-45db-ad0f-52f1c84717c0',
    ];
    const { data, error } = await supabase
      .from('works')
      .select('id, ubqn, status, updated_at, checklist')
      .in('id', ids);
    if (error) {
      console.error('Supabase error:', error);
      process.exit(1);
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
})();
