'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';


export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setMessage('Password reset link sent to your email.');
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
            N
          </div>
          <h1 className="text-2xl font-bold text-[#201515]">Reset Password</h1>
          <p className="text-sm text-[#605d52] mt-1">We will email you a link to reset your password</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {errorMsg}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-6">
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
              placeholder="admin@gym.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#ff4f00] hover:bg-[#e04500] text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50 text-sm"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <div className="text-center mt-4">
            <a href="/login" className="text-sm text-[#ff4f00] hover:underline">
              Back to Login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
