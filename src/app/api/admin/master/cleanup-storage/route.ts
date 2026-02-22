
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

        // 1. Process Database Cleanup FIRST (Remove orphaned records so their images are not whitelisted)
        console.log('[SystemCleanup] Starting database cleanup...');
        let dbStats = {};
        const errors: string[] = [];

        try {
            const { data, error } = await supabaseAdmin.rpc('admin_cleanup_database');
            if (error) {
                console.warn('[SystemCleanup] Database cleanup RPC failed (Function might be missing):', error.message);
                errors.push(`Database Clean Failed: ${error.message}`);
            } else {
                dbStats = data || {};
                console.log('[SystemCleanup] Database Stats:', dbStats);
            }

            // NEW: Smart Purge (History 3 months retention)
            const { data: purgeData, error: purgeError } = await supabaseAdmin.rpc('admin_perform_smart_purge');
            if (purgeError) {
                console.warn('[SystemCleanup] Smart Purge RPC failed:', purgeError.message);
                errors.push(`Smart Purge Failed: ${purgeError.message}`);
            } else {
                dbStats = { ...dbStats, smart_purge: purgeData };
                console.log('[SystemCleanup] Smart Purge Stats:', purgeData);
            }

        } catch (dbErr: any) {
            console.error('[SystemCleanup] Unexpected DB error:', dbErr);
            errors.push(`DB Clean Error: ${dbErr.message}`);
        }

        // 2. Get all referenced files from DB (Authorized Source of Truth AFTER cleanup)
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('avatar_url')
            .not('avatar_url', 'is', null);

        if (profilesError) console.warn(`Error fetching profiles: ${profilesError.message}`);

        const { data: tenants, error: tenantsError } = await supabaseAdmin
            .from('tenants')
            .select('logo_url')
            .not('logo_url', 'is', null);

        if (tenantsError) console.warn(`Error fetching tenants: ${tenantsError.message}`);

        const { data: services, error: servicesError } = await supabaseAdmin
            .from('services')
            .select('image_url')
            .not('image_url', 'is', null);

        if (servicesError) console.warn(`Error fetching services: ${servicesError.message}`);

        const { data: products, error: productsError } = await supabaseAdmin
            .from('products')
            .select('image_url')
            .not('image_url', 'is', null);

        if (productsError) console.warn(`Error fetching products: ${productsError.message}`);

        // Normalize Active Files Set (extract filenames)
        const activeFiles = new Set<string>();

        const extractFilename = (url: string) => {
            if (!url || url.startsWith('data:')) return null; // Ignore Base64
            try {
                // Handle different URL formats
                // Standard Supabase: .../bucket/folder/filename.ext
                // Custom Domain: .../filename.ext
                const parts = url.split('/');
                const filename = parts[parts.length - 1];
                return filename.split('?')[0]; // Remove query params
            } catch (e) {
                return null;
            }
        };

        profiles?.forEach(p => {
            const fname = extractFilename(p.avatar_url);
            if (fname) activeFiles.add(fname);
        });

        tenants?.forEach(t => {
            const fname = extractFilename(t.logo_url);
            if (fname) activeFiles.add(fname);
        });

        services?.forEach(s => {
            const fname = extractFilename(s.image_url);
            if (fname) activeFiles.add(fname);
        });

        products?.forEach(p => {
            const fname = extractFilename(p.image_url);
            if (fname) activeFiles.add(fname);
        });

        console.log(`[StorageCleanup] Found ${activeFiles.size} active references in DB.`);

        const deletedFiles: string[] = [];
        const keptFiles: string[] = [];
        let totalScanned = 0;

        // 3. Process ALL buckets dynamically
        const { data: bucketList, error: bucketListError } = await supabaseAdmin.storage.listBuckets();

        // Default to known buckets if listing fails
        let buckets = ['avatars', 'logos', 'products', 'services', 'public'];

        if (bucketListError) {
            console.error('[StorageCleanup] Error listing buckets:', bucketListError);
            errors.push(`List Buckets Failed: ${bucketListError.message}`);
        } else if (bucketList) {
            buckets = bucketList.map(b => b.name);
        }

        console.log(`[StorageCleanup] Buckets to scan: ${buckets.join(', ')}`);

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
                    // Start tolerant logging - some buckets might be private or not listable
                    console.warn(`[StorageCleanup] Skipped bucket/folder ${bucket}: ${error.message}`);
                    break;
                }

                if (!files || files.length === 0) {
                    hasMore = false;
                    break;
                }

                totalScanned += files.length;

                // Identification Logic
                const orphanFiles = files.filter(f => {
                    // Safety Check: Ignore folders or non-files
                    if (f.name === '.emptyFolderPlaceholder') return false;
                    if (!f.id) return false; // Folders often don't have ID in some responses, or check metadata

                    // Safety Check: Keep files newer than 12 hours
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
