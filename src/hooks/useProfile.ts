"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

export function useProfile() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function getProfile() {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (!error) setProfile(data);
            }
            setLoading(false);
        }

        getProfile();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            getProfile();
        });

        return () => subscription.unsubscribe();
    }, []);

    return { profile, loading };
}
