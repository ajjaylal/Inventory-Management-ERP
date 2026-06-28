'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  LogOut 
} from 'lucide-react';

const MENU_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Stock', href: '/stock', icon: Boxes },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Products Sold', href: '/products-sold', icon: TrendingUp },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [companyName, setCompanyName] = React.useState('LAWZ GIFTS');

  React.useEffect(() => {
    // Load from localStorage first for instant display
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('companyName');
      if (saved) setCompanyName(saved);
    }
    // Then fetch from DB (source of truth)
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('company_name')
        .eq('id', 1)
        .single();
      if (data?.company_name) {
        setCompanyName(data.company_name);
        localStorage.setItem('companyName', data.company_name);
      }
    };
    fetchSettings();

    // Listen for in-session updates from the settings page
    const handleSettingsChange = () => {
      const updated = localStorage.getItem('companyName');
      if (updated) setCompanyName(updated);
    };
    window.addEventListener('storage', handleSettingsChange);
    window.addEventListener('settingsUpdated', handleSettingsChange);
    return () => {
      window.removeEventListener('storage', handleSettingsChange);
      window.removeEventListener('settingsUpdated', handleSettingsChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoInitial = companyName.trim().charAt(0).toUpperCase() || 'L';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-[#f8f4f0] border-r border-[#c5c0b1] flex flex-col h-screen fixed left-0 top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#c5c0b1] flex items-center gap-3">
        <div className="h-8 w-8 bg-[#ff4f00] rounded-md flex items-center justify-center text-white font-bold text-lg shadow-sm">
          {logoInitial}
        </div>
        <div>
          <h2 className="font-bold text-[#201515] text-sm tracking-wide uppercase">{companyName}</h2>
          <span className="text-[11px] text-[#605d52] font-semibold">INVENTORY ERP</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-white text-[#ff4f00] border-l-4 border-[#ff4f00] shadow-sm font-semibold' 
                  : 'text-[#605d52] hover:bg-[#fffefb] hover:text-[#201515]'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#ff4f00]' : 'text-[#605d52]'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Action */}
      <div className="p-4 border-t border-[#c5c0b1] bg-[#f8f4f0]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition"
        >
          <LogOut className="h-4 w-4 text-red-600" />
          Logout
        </button>
      </div>
    </aside>
  );
}
