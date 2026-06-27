'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, AlertCircle } from 'lucide-react';

interface UOM {
  id: string;
  name: string;
  abbreviation: string;
}

interface StockItem {
  id: string;
  item_name: string;
  category: string;
  description: string | null;
  cached_quantity: number;
  low_stock_level: number;
  status: 'Active' | 'Inactive';
  uom_id: string;
}

interface Props {
  item: StockItem | null;
  uoms: UOM[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateStockItemModal({ item, uoms, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const [name, setName] = useState(item?.item_name || '');
  const [category, setCategory] = useState(item?.category || '');
  const [description, setDescription] = useState(item?.description || '');
  const [uomId, setUomId] = useState(item?.uom_id || uoms[0]?.id || '');
  const [lowStock, setLowStock] = useState<string>(item?.low_stock_level !== undefined ? String(item.low_stock_level) : '0');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Client-side validation
    if (!name.trim()) {
      setErrorMsg('Item name is required.');
      setLoading(false);
      return;
    }
    if (!category.trim()) {
      setErrorMsg('Category is required.');
      setLoading(false);
      return;
    }
    if (!uomId) {
      setErrorMsg('Please select a Unit of Measure.');
      setLoading(false);
      return;
    }
    const lowStockNum = Number(lowStock);
    if (lowStock === '' || isNaN(lowStockNum) || lowStockNum < 0) {
      setErrorMsg('Low stock alert threshold must be a valid non-negative number.');
      setLoading(false);
      return;
    }

    try {
      // Ensure user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setErrorMsg('You are not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      const payload = {
        item_name: name.trim(),
        category: category.trim(),
        description: description.trim() || null,
        uom_id: uomId,
        low_stock_level: Number(lowStock),
        created_by: user.id,
      };

      if (item) {
        // ── EDIT MODE ──
        const { error } = await supabase
          .from('stock_items')
          .update(payload)
          .eq('id', item.id);
        if (error) throw error;
      } else {
        // ── CREATE MODE ──
        const { data: newItem, error: insertError } = await supabase
          .from('stock_items')
          .insert({
            ...payload,
            cached_quantity: 0,
            status: 'Active',
          })
          .select('id, item_name')
          .single();

        if (insertError) throw insertError;
        if (!newItem) throw new Error('Item was not created — no data returned.');

        // Log the Initial Stock transaction (quantity 0 — just registers the item)
        const { error: txError } = await supabase.from('stock_transactions').insert({
          stock_item_id: newItem.id,
          transaction_type: 'Initial Stock',
          quantity: 0,
          remarks: 'Item registered in inventory system',
          created_by: user.id,
          reference_type: 'Initial Stock',
        });

        // Transaction log failure is non-fatal — item already created
        if (txError) {
          console.warn('Stock transaction log failed (non-fatal):', txError.message);
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('CreateStockItemModal error:', err);
      // Surface the real Supabase error message
      const msg = err?.message || err?.error_description || JSON.stringify(err) || 'An unexpected error occurred.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[#fffefb] border border-[#c5c0b1] rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#c5c0b1] bg-[#f8f4f0]">
          <h3 className="font-bold text-lg text-[#201515]">
            {item ? 'Edit Stock Item' : 'Add New Stock Item'}
          </h3>
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

          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
              Item Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00] transition"
              placeholder="e.g. Almond, Cashew, Ribbon, Gift Box"
            />
          </div>

          {/* Category & UOM */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Category *
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00] transition"
                placeholder="e.g. Consumable, Packaging"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Unit of Measure *
              </label>
              {uoms.length === 0 ? (
                <div className="w-full px-4 py-2 border border-amber-300 bg-amber-50 rounded-lg text-sm text-amber-700">
                  Loading units...
                </div>
              ) : (
                <select
                  value={uomId}
                  onChange={(e) => setUomId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00] transition"
                >
                  <option value="">Select unit...</option>
                  {uoms.map((uom) => (
                    <option key={uom.id} value={uom.id}>
                      {uom.name} ({uom.abbreviation})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Low Stock Level */}
          <div>
            <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
              Low Stock Alert Threshold *
            </label>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={lowStock}
              onChange={(e) => setLowStock(e.target.value)}
              className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00] transition"
              placeholder="e.g. 100"
            />
            <p className="text-xs text-[#939084] mt-1">
              A warning will appear when stock falls below this level.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-2 focus:ring-[#ff4f00] transition resize-none"
              placeholder="Optional: vendor info, usage notes..."
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
              disabled={loading || uoms.length === 0}
              className="px-5 py-2 bg-[#ff4f00] hover:bg-[#e04500] text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <span className="inline-block h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {loading ? 'Saving...' : item ? 'Update Item' : 'Add Stock Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
