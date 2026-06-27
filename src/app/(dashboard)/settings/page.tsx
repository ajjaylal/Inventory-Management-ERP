'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Save, Lock, Building } from 'lucide-react';

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Organization settings
  const [companyName, setCompanyName] = useState('LAWZ GIFTS');
  const [currency, setCurrency] = useState('USD ($)');
  const [timezone, setTimezone] = useState('UTC');

  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfileId(user.id);
        setEmail(user.email || '');
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (profile) {
          setFullName(profile.full_name);
        }
      }
    };
    loadProfile();

    if (typeof window !== 'undefined') {
      const savedCompany = localStorage.getItem('companyName');
      const savedCurrency = localStorage.getItem('currency');
      const savedTimezone = localStorage.getItem('timezone');
      if (savedCompany) setCompanyName(savedCompany);
      if (savedCurrency) setCurrency(savedCurrency);
      if (savedTimezone) setTimezone(savedTimezone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveOrgSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setMessage(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('companyName', companyName);
      localStorage.setItem('currency', currency);
      localStorage.setItem('timezone', timezone);
      setMessage('Organization settings saved successfully.');
      // Dispatch custom event to notify Sidebar in the same window
      window.dispatchEvent(new Event('settingsUpdated'));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profileId);

      if (error) throw error;
      setMessage('Profile updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Password updated successfully.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#201515] tracking-tight">System Settings</h1>
        <p className="text-sm text-[#605d52] mt-1">Configure profile and system settings</p>
      </div>

      {message && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
          {message}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Card */}
        <div className="bg-white border border-[#c5c0b1] rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-[#c5c0b1] pb-4">
            <Building className="h-5 w-5 text-[#ff4f00]" />
            <h3 className="font-bold text-[#201515]">Profile Details</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Email Address (read-only)
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-[#f8f4f0] text-[#605d52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#ff4f00] hover:bg-[#e04500] text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              <Save className="h-4 w-4" />
              Save Profile
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white border border-[#c5c0b1] rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-[#c5c0b1] pb-4">
            <Lock className="h-5 w-5 text-[#ff4f00]" />
            <h3 className="font-bold text-[#201515]">Change Password</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                New Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#ff4f00] hover:bg-[#e04500] text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              <Lock className="h-4 w-4" />
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* System Configurations */}
      <form onSubmit={handleSaveOrgSettings} className="bg-white border border-[#c5c0b1] rounded-xl p-6 shadow-sm space-y-6">
        <div className="border-b border-[#c5c0b1] pb-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[#201515]">Localization & Organization Settings</h3>
            <p className="text-xs text-[#605d52] mt-1">Configure company profile, currency display, and timezone.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
              Company Name
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
              Primary Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
            >
              <option value="USD ($)">USD ($)</option>
              <option value="EUR (€)">EUR (€)</option>
              <option value="GBP (£)">GBP (£)</option>
              <option value="AED (AED)">AED (AED)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="GMT">GMT (Greenwich Mean Time)</option>
              <option value="EST">EST (Eastern Standard Time)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST - Gulf Standard Time)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-[#ff4f00] hover:bg-[#e04500] text-white text-sm font-semibold rounded-lg shadow-sm transition"
        >
          <Save className="h-4 w-4" />
          Save Organization Settings
        </button>
      </form>
    </div>
  );
}
