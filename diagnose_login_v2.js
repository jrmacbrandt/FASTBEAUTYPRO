const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://sxunkigrburoknsshezl.supabase.co";
// Nota: O usuário não forneceu a SERVICE_ROLE_KEY no ambiente local, 
// então este script focará em testar a resposta do Auth via Anon Key.

const supabase = createClient(supabaseUrl, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dW5raWdyYnVyb2tuc3NoZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTA3ODksImV4cCI6MjA4NTg2Njc4OX0.bnBzEbQEcoP0rPXzaGMj1r493hmN73ut1xVGkdWj6Eo");

async function diagnose() {
    console.log("--- DIAGNÓSTICO DE LOGIN ---");
    const email = "jrmacbrandt@yahoo.com";
    const pass = "12345678";

    console.log(`Tentando login para: ${email}`);
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass,
    });

    if (error) {
        console.error("❌ ERRO NO AUTH:", error.message);
        console.log("Status Code:", error.status);

        if (error.message.includes("Email not confirmed")) {
            console.log("💡 CAUSA: O e-mail não foi confirmado no Supabase.");
        } else if (error.status === 400) {
            console.log("💡 CAUSA: Credenciais realmente inválidas ou usuário não existe no Auth.");
        }
    } else {
        console.log("✅ LOGIN COM SUCESSO!");
        console.log("User ID:", data.user.id);
        console.log("Metadata:", data.user.user_metadata);

        // Verificar se conseguimos ler o profile
        const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (pError) {
            console.error("❌ ERRO AO LER PROFILE:", pError.message);
        } else {
            console.log("✅ PROFILE ENCONTRADO:", profile);
        }
    }
}

diagnose();
