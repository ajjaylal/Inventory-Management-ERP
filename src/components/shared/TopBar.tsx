'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, User } from 'lucide-react';

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
    <header className="h-16 border-b border-[#c5c0b1] bg-white flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Search Input */}
      <div className="relative w-96">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-[#939084]" />
        </span>
        <input
          type="text"
          placeholder="Global search stock, products, invoices..."
          className="w-full pl-10 pr-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-[#fffefb] text-[#201515] placeholder-[#939084] focus:outline-none focus:ring-1 focus:ring-[#ff4f00] focus:border-[#ff4f00]"
        />
      </div>

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
