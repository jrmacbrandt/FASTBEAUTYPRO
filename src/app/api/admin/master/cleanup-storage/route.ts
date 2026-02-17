
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        console.log('[StorageCleanup] Starting analysis...');

        // 1. Get all referenced files from DB (Authorized Source of Truth)
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('avatar_url')
            .not('avatar_url', 'is', null);

        if (profilesError) throw new Error(`Error fetching profiles: ${profilesError.message}`);

        const { data: tenants, error: tenantsError } = await supabaseAdmin
            .from('tenants')
            .select('logo_url')
            .not('logo_url', 'is', null);

        if (tenantsError) throw new Error(`Error fetching tenants: ${tenantsError.message}`);

        // Normalize Active Files Set (extract filenames)
        const activeFiles = new Set<string>();

        profiles?.forEach(p => {
            if (p.avatar_url) {
                // avatar_url format: .../storage/v1/object/public/avatars/filename.webp
                const parts = p.avatar_url.split('/');
                const filename = parts[parts.length - 1];
                // Remove query parameters if any
                const cleanFilename = filename.split('?')[0];
                activeFiles.add(cleanFilename);
            }
        });

        tenants?.forEach(t => {
            if (t.logo_url) {
                const parts = t.logo_url.split('/');
                const filename = parts[parts.length - 1];
                const cleanFilename = filename.split('?')[0];
                activeFiles.add(cleanFilename);
            }
        });

        console.log(`[StorageCleanup] Found ${activeFiles.size} active references in DB.`);

        const deletedFiles: string[] = [];
        const keptFiles: string[] = [];
        const errors: string[] = [];
        let totalScanned = 0;

        // 2. Process Database Cleanup
        console.log('[SystemCleanup] Starting database cleanup...');
        let dbStats = {};
        try {
            const { data, error } = await supabaseAdmin.rpc('admin_cleanup_database');
            if (error) {
                console.warn('[SystemCleanup] Database cleanup RPC failed (Function might be missing):', error.message);
                errors.push(`Database Clean Failed: ${error.message}`);
            } else {
                dbStats = data || {};
                console.log('[SystemCleanup] Database Stats:', dbStats);
            }
        } catch (dbErr: any) {
            console.error('[SystemCleanup] Unexpected DB error:', dbErr);
            errors.push(`DB Clean Error: ${dbErr.message}`);
        }

        // 3. Process known buckets for Storage Cleanup
        const buckets = ['avatars', 'logos'];

        for (const bucket of buckets) {
            let hasMore = true;
            let page = 0;
            const pageSize = 100;

            console.log(`[StorageCleanup] Scanning bucket: ${bucket}...`);

            while (hasMore) {
                const { data: files, error } = await supabaseAdmin.storage.from(bucket).list('', {
                    limit: pageSize,
                    offset: page * pageSize,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

                if (error) {
                    errors.push(`Error listing ${bucket}: ${error.message}`);
                    break;
                }

                if (!files || files.length === 0) {
                    hasMore = false;
                    break;
                }

                totalScanned += files.length;

                // Identification Logic
                const orphanFiles = files.filter(f => {
                    // Safety Check: Ignore folders or non-files if any (Storage returns .placeholder sometimes)
                    if (f.name === '.emptyFolderPlaceholder') return false;

                    // Safety Check: Keep files newer than 24 hours to avoid race conditions with uploads
                    // User explicitly mentioned "deleted during tests", so older files are the target.
                    // Let's use 12 hours as a safe buffer.
                    const fileTime = new Date(f.created_at).getTime();
                    const safeTime = Date.now() - (12 * 60 * 60 * 1000);

                    if (fileTime > safeTime) return false;

                    // If file is NOT in active set, it is an orphan
                    return !activeFiles.has(f.name);
                });

                const keptInPage = files.filter(f => !orphanFiles.includes(f));
                keptFiles.push(...keptInPage.map(f => `${bucket}/${f.name}`));

                if (orphanFiles.length > 0) {
                    const paths = orphanFiles.map(f => f.name);
                    console.log(`[StorageCleanup] Deleting ${paths.length} orphans from ${bucket}...`);

                    const { error: delError } = await supabaseAdmin.storage.from(bucket).remove(paths);

                    if (delError) {
                        errors.push(`Failed to delete from ${bucket}: ${delError.message}`);
                    } else {
                        deletedFiles.push(...paths.map(p => `${bucket}/${p}`));
                    }
                }

                if (files.length < pageSize) hasMore = false;
                page++;
            }
        }

        console.log(`[SystemCleanup] Complete. Scanned: ${totalScanned}, Deleted (Storage): ${deletedFiles.length}`);

        return NextResponse.json({
            success: true,
            stats: {
                storage: {
                    scanned_total: totalScanned,
                    deleted_count: deletedFiles.length,
                    kept_count: keptFiles.length,
                    buckets_scanned: buckets
                },
                database: dbStats,
                errors: errors.length > 0 ? errors : undefined
            }
        });

    } catch (error: any) {
        console.error('[StorageCleanup] Critical Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
