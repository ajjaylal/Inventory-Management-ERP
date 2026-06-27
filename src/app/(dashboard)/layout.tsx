import React from 'react';
import Sidebar from '@/components/shared/Sidebar';
import TopBar from '@/components/shared/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fffefb] text-[#201515] flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace Pane */}
      <div className="flex-1 flex flex-col pl-64">
        {/* Top Navbar */}
        <TopBar />

        {/* Dynamic Route Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
