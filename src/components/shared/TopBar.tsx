'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from 'lucide-react';

export default function TopBar() {
  const supabase = createClient();
  const [userName, setUserName] = useState('Admin User');
  const [userRole, setUserRole] = useState('Admin');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserName(profile.full_name);
          setUserRole(profile.role);
        }
      }
    };
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className="h-16 border-b border-[#c5c0b1] bg-white flex items-center justify-end px-8 sticky top-0 z-10">
      {/* User Actions */}
      <div className="flex items-center gap-6">

        {/* User Card */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#f8f4f0] rounded-full flex items-center justify-center border border-[#c5c0b1]">
            <User className="h-4 w-4 text-[#201515]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#201515]">{userName}</p>
            <p className="text-[11px] text-[#605d52] font-semibold uppercase">{userRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
