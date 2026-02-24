
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://sxunkigrburoknsshezl.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dW5raWdyYnVyb2tuc3NoZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTA3ODksImV4cCI6MjA4NTg2Njc4OX0.bnBzEbQEcoP0rPXzaGMj1r493hmN73ut1xVGkdWj6Eo";

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAppointments() {
    console.log('--- BUSCANDO AGENDAMENTOS NO BANCO ---');

    const { data, error, count } = await supabase
        .from('appointments')
        .select(`id, status, customer_name`, { count: 'exact' });

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(`Total de agendamentos no banco: ${count}`);

    if (data && data.length > 0) {
        console.log('Sample (primeiros 5):');
        console.log(data.slice(0, 5));
    }
}

listAppointments();
