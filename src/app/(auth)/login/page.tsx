'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fffefb] px-4">
      <div className="w-full max-w-md bg-[#f8f4f0] p-8 rounded-xl border border-[#c5c0b1] shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-10 w-10 bg-[#ff4f00] rounded-lg flex items-center justify-center text-white font-bold text-xl mb-3 shadow-sm">
            L
          </div>
          <h1 className="text-2xl font-bold text-[#201515]">LAWZ GIFTS</h1>
          <p className="text-sm text-[#605d52] mt-1">Enterprise Inventory Management</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#201515] mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[#c5c0b1] bg-white text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00] transition text-sm"
              placeholder="username"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-[#201515]">
                Password
              </label>
              <a
                href="/forgot-password"
                className="text-xs text-[#ff4f00] hover:underline"
              >
                Forgot Password?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#c5c0b1] bg-white text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00] transition text-sm pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#605d52] hover:text-[#201515] p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#ff4f00] hover:bg-[#e04500] text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50 text-sm"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
