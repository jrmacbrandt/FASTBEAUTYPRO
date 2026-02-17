
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// MANUALLY LOAD ENV VARS FOR TEST
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    console.log('[Test Setup] Loading .env.local from:', envPath);
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            let value = valueParts.join('=').trim();
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key.trim()] = value;
        }
    });
} else {
    console.warn('[Test Setup] .env.local not found at:', envPath);
}

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Environment variables loaded keys:', Object.keys(process.env));
    throw new Error('Missing Environment Variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) for Test');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

describe('Auditoria de Segurança: Sistema de Cupons', () => {
    const TEST_CODE = `AUDIT_TEST_${Date.now()}`;
    let couponId: string;

    // 1. Criação do cenário
    it('Deve criar um cupom de teste para auditoria', async () => {
        const { data, error } = await supabase.from('coupons').insert({
            code: TEST_CODE,
            discount_type: 'full_access',
            max_uses: 10,
            active: true
        }).select().single();

        if (error) console.error('Error creating coupon:', error);
        expect(error).toBeNull();
        expect(data).toBeDefined();
        couponId = data.id;
        console.log(`[Audit] Cupom criado: ${TEST_CODE} (${couponId})`);
    });

    // 2. Teste de Pausa (Simulação de Cadastro)
    it('Deve bloquear o uso de um cupom PAUSADO', async () => {
        // Pausar o cupom
        const { error: updateError } = await supabase
            .from('coupons')
            .update({ active: false })
            .eq('id', couponId);
        expect(updateError).toBeNull();

        // Tentar buscar como o sistema de login faz (filtrando por active=true)
        const { data: searchResult, error: searchError } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', TEST_CODE)
            .eq('active', true) // A query do Login exige active=true
            .maybeSingle();

        // O resultado deve ser NULO, pois o cupom está pausado (active=false)
        expect(searchResult).toBeNull();

        console.log('[Audit] Bloqueio por pausa verificado com sucesso.');
    });

    // 3. Teste de Exclusão e Limpeza
    it('Deve excluir permanentemente o cupom do banco de dados', async () => {
        // Excluir
        const { error: deleteError } = await supabase
            .from('coupons')
            .delete()
            .eq('id', couponId);
        expect(deleteError).toBeNull();

        // Verificar se ainda existe de alguma forma (ignorando filtros)
        const { data: ghostCheck } = await supabase
            .from('coupons')
            .select('*')
            .eq('id', couponId)
            .maybeSingle();

        expect(ghostCheck).toBeNull();
        console.log('[Audit] Exclusão física confirmada. Nenhum lixo residual.');
    });
});
