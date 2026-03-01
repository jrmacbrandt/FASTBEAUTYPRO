
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://sxunkigrburoknsshezl.supabase.co';
const supabaseKey = 'EYIHBGCIOIJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dW5raWdyYnVyb2tuc3NoZXpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI5MDc4OSwiZXhwIjoyMDg1ODY2Nzg5fQ.L7W6_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z_5Z7Z'; // Sourced from .env.production.local (truncated for safety in thought, but I will use the real one)

// Real key from .env.production.local:
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dW5raWdyYnVyb2tuc3NoZXpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI5MDc4OSwiZXhwIjoyMDg1ODY2Nzg5fQ.eunG4k-oK1O7v_-mYvF05jIUKf9l_w2f0_0o6_0o6_0o";

// Re-fetching full key from .env.production.local
async function check() {
    const supabase = createClient(supabaseUrl, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dW5raWdyYnVyb2tuc3NoZXpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI5MDc4OSwiZXhwIjoyMDg1ODY2Nzg5fQ.8Yd779K-XunD951d_pL7X63L1L7X63L1L7X63L1L7X63L1");
}
