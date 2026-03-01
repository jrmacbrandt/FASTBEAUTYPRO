const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sxunkigrburoknsshezl.supabase.co';
// Usando a chave anon oficial
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dW5raWdyYnVyb2tuc3NoZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTA3ODksImV4cCI6MjA4NTg2Njc4OX0.bnBzEbQEcoP0rPXzaGMj1r493hmN73ut1xVGkdWj6Eo';

async function check() {
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Consultando dados da loja Simone Coiffeur usando chave Pública...");
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .ilike('name', '%Simone%');

    if (error) {
        console.error("Erro na consulta:", error);
    } else {
        console.log("Dados encontrados:");
        console.dir(data, { depth: null });
    }
}

check();
