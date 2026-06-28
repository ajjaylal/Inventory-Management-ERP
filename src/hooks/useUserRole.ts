'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  role: 'Admin' | 'Staff';
  full_name: string;
}

let cachedProfile: UserProfile | null = null;

export function useUserRole() {
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile);

  useEffect(() => {
    if (cachedProfile) {
      setProfile(cachedProfile);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        if (data) {
          cachedProfile = data as UserProfile;
          setProfile(cachedProfile);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  return {
    role: profile?.role ?? null,
    fullName: profile?.full_name ?? null,
    isAdmin: profile?.role === 'Admin',
    isStaff: profile?.role === 'Staff',
    loading,
  };
}
