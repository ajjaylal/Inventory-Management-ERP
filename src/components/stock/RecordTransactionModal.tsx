'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, AlertCircle } from 'lucide-react';

interface StockItem {
  id: string;
  item_name: string;
  cached_quantity: number;
  units_of_measure: {
    name: string;
    abbreviation: string;
  };
}

interface Props {
  item: StockItem;
  onClose: () => void;
  onSuccess: () => void;
}

// Transaction types that reduce stock (quantity stored as negative)
const DEDUCTING_TYPES = ['Stock Out', 'Damaged Stock', 'Expired Stock'];

// Transaction types that increase stock (quantity stored as positive)
const ADDING_TYPES = ['Stock In', 'Returned Stock'];

export default function RecordTransactionModal({ item, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const [txType, setTxType] = useState('Stock In');
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDeducting = DEDUCTING_TYPES.includes(txType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setErrorMsg('Please enter a valid positive quantity.');
      setLoading(false);
      return;
    }

    // Apply sign based on transaction type
    let signedQty = numQty;
    if (isDeducting) {
      signedQty = -numQty;
    }
    // Manual Adjustment: user enters signed value directly
    if (txType === 'Manual Adjustment') {
      signedQty = numQty; // positive means add
    }

    // Guard against negative stock on client side
    if (item.cached_quantity + signedQty < 0) {
      setErrorMsg(
        `Insufficient stock. Current balance: ${item.cached_quantity} ${item.units_of_measure.abbreviation}. ` +
        `You are trying to deduct ${numQty} ${item.units_of_measure.abbreviation}. ` +
        `Shortage: ${Math.abs(item.cached_quantity + signedQty)} ${item.units_of_measure.abbreviation}.`
      );
      setLoading(false);
      return;
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setErrorMsg('Authentication error. Please log in again.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('stock_transactions').insert({
        stock_item_id: item.id,
        transaction_type: txType,
        quantity: signedQty,
        remarks: remarks.trim() || null,
        created_by: user.id,
        reference_type: 'Manual Adjustment',
      });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      console.error('RecordTransactionModal error:', err);
      const msg = err?.message || err?.error_description || 'Failed to log transaction.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[#fffefb] border border-[#c5c0b1] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#c5c0b1] bg-[#f8f4f0]">
          <h3 className="font-bold text-lg text-[#201515]">Record Stock Transaction</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white rounded-full transition border border-transparent hover:border-[#c5c0b1]"
          >
            <X className="h-4 w-4 text-[#605d52]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Item Info */}
          <div className="bg-[#f8f4f0] border border-[#c5c0b1] rounded-lg px-4 py-3">
            <p className="text-xs font-bold text-[#605d52] uppercase tracking-wider mb-1">Stock Item</p>
            <p className="text-sm font-semibold text-[#201515]">{item.item_name}</p>
            <p className="text-xs text-[#939084] mt-0.5">
              Current Balance: <span className="font-bold text-[#201515]">{item.cached_quantity} {item.units_of_measure.abbreviation}</span>
            </p>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
              Transaction Type *
            </label>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00] transition"
            >
              <option value="Stock In">📦 Stock In (adds to inventory)</option>
              <option value="Stock Out">📤 Stock Out (deducts from inventory)</option>
              <option value="Manual Adjustment">⚙️ Manual Adjustment</option>
              <option value="Damaged Stock">💔 Damaged Stock (deducts)</option>
              <option value="Expired Stock">⏰ Expired Stock (deducts)</option>
              <option value="Returned Stock">↩️ Returned Stock (adds)</option>
            </select>
            <p className="text-xs mt-1 font-medium" style={{ color: isDeducting ? '#dc2626' : '#16a34a' }}>
              {isDeducting
                ? `⬇ This will DEDUCT from current stock (${item.cached_quantity} ${item.units_of_measure.abbreviation})`
                : txType === 'Manual Adjustment'
                ? '↕ Positive number adds to stock'
                : `⬆ This will ADD to current stock (${item.cached_quantity} ${item.units_of_measure.abbreviation})`
              }
            </p>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
              Quantity ({item.units_of_measure.name}) *
            </label>
            <input
              type="number"
              required
              min="0.01"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00] transition"
              placeholder={`e.g. 500 (${item.units_of_measure.abbreviation})`}
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
              Remarks / Reason
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00] transition resize-none"
              placeholder="e.g. Received from vendor ABC, Invoice #12345"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#c5c0b1]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-[#c5c0b1] hover:bg-[#f8f4f0] text-sm font-semibold rounded-lg text-[#201515] bg-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#ff4f00] hover:bg-[#e04500] text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <span className="inline-block h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {loading ? 'Recording...' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
