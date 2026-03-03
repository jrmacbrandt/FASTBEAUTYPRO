const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://sxunkigrburoknsshezl.supabase.co";
// NOTA: Para rodar este script, o usuário precisaria da SERVICE_ROLE_KEY.
// Como não a tenho, deixo o script pronto como MODELO para ele.

const supabaseAdmin = createClient(supabaseUrl, "COLOQUE_SUA_SERVICE_ROLE_KEY_AQUI");

async function resetBarber() {
    console.log("--- RESETANDO PROFISSIONAL DE TESTE ---");
    const email = "jrmacbrandt@yahoo.com";
    const pass = "12345678";

    // 1. Buscar o ID do usuário
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = users?.users.find(u => u.email === email);

    if (targetUser) {
        console.log(`Usuário encontrado: ${targetUser.id}. Resetando senha...`);

        // 2. Forçar nova senha e marcar como confirmado
        const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
            password: pass,
            email_confirm: true
        });

        if (resetError) {
            console.error("❌ ERRO AO RESETAR:", resetError.message);
        } else {
            console.log("✅ SENHA RESETADA PARA 12345678 E E-MAIL CONFIRMADO!");
        }
    } else {
        console.log("❌ USUÁRIO NÃO ENCONTRADO NO AUTH.");
    }
}

// resetBarber();
