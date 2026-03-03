import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        if (!serviceRoleKey) {
            return NextResponse.json({ error: 'Falta SERVICE_ROLE_KEY no servidor' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // 1. Get Tenant Hours
        const { data: tenant, error: tError } = await supabaseAdmin
            .from('tenants')
            .select('id, name, business_hours')
            .eq('slug', 'simone-coiffeur')
            .single();

        // 2. Get Barber Hours
        const { data: barber, error: bError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, work_hours')
            .ilike('full_name', '%João Rolha%')
            .single();

        return NextResponse.json({
            tenant: {
                name: tenant?.name,
                business_hours: tenant?.business_hours
            },
            barber: {
                name: barber?.full_name,
                work_hours: barber?.work_hours
            },
            errors: {
                tenant: tError?.message,
                barber: bError?.message
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
