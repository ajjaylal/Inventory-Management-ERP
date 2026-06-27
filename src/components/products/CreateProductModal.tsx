'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Plus, Trash } from 'lucide-react';

interface StockItem {
  id: string;
  item_name: string;
  category: string;
  units_of_measure: {
    abbreviation: string;
  };
}

interface IngredientRow {
  stockItemId: string;
  quantity: number;
  uomAbbr: string;
}

interface Product {
  id: string;
  product_name: string;
  product_code: string;
  description: string | null;
  selling_price: number;
  status: 'Active' | 'Inactive' | 'Archived';
  product_ingredients: Array<{
    stock_item_id: string;
    quantity: number;
  }>;
}

interface Props {
  product: Product | null;
  isDuplicate: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProductModal({ product, isDuplicate, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    const loadStock = async () => {
      const { data } = await supabase
        .from('stock_items')
        .select('id, item_name, category, units_of_measure(abbreviation)')
        .eq('status', 'Active')
        .order('item_name');
      if (data) setStockItems(data as any);
    };
    loadStock();
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currency');
      if (saved) {
        const match = saved.match(/\(([^)]+)\)/);
        if (match) setCurrencySymbol(match[1]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (product) {
      setName(isDuplicate ? `${product.product_name} (Copy)` : product.product_name);
      setCode(isDuplicate ? `${product.product_code}-COPY` : product.product_code);
      setDescription(product.description || '');
      setPrice(String(product.selling_price));
      setStatus(product.status === 'Archived' ? 'Inactive' : product.status);

      // Map ingredients
      if (product.product_ingredients) {
        const rows = product.product_ingredients.map(pi => {
          const item = stockItems.find(si => si.id === pi.stock_item_id);
          return {
            stockItemId: pi.stock_item_id,
            quantity: pi.quantity,
            uomAbbr: item?.units_of_measure?.abbreviation || ''
          };
        });
        setIngredients(rows);
      }
    } else {
      setName('');
      setCode('');
      setDescription('');
      setPrice('');
      setStatus('Active');
      setIngredients([{ stockItemId: '', quantity: 1, uomAbbr: '' }]);
    }
  }, [product, isDuplicate, stockItems]);

  const handleAddRow = () => {
    setIngredients([...ingredients, { stockItemId: '', quantity: 1, uomAbbr: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    const next = [...ingredients];
    next.splice(index, 1);
    setIngredients(next);
  };

  const handleRowChange = (index: number, field: keyof IngredientRow, value: any) => {
    const next = [...ingredients];
    if (field === 'stockItemId') {
      const selectedItem = stockItems.find(si => si.id === value);
      next[index] = {
        ...next[index],
        stockItemId: value,
        uomAbbr: selectedItem?.units_of_measure?.abbreviation || ''
      };
    } else {
      next[index] = {
        ...next[index],
        [field]: value
      };
    }
    setIngredients(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Validations
    if (ingredients.length === 0) {
      setErrorMsg('Product must contain at least 1 ingredient.');
      setLoading(false);
      return;
    }

    const uniqueItems = new Set(ingredients.map(r => r.stockItemId));
    if (uniqueItems.size !== ingredients.length) {
      setErrorMsg('Duplicate ingredients are not allowed in the same product.');
      setLoading(false);
      return;
    }

    if (ingredients.some(r => !r.stockItemId || r.quantity <= 0)) {
      setErrorMsg('All ingredients must have a selected stock item and a positive quantity.');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const productPayload = {
        product_name: name,
        product_code: code.trim(),
        description: description || null,
        selling_price: Number(price),
        status,
        created_by: user?.id || null,
      };

      let productId = '';

      if (product && !isDuplicate) {
        // Update product metadata
        const { error: prodErr } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', product.id);
        if (prodErr) throw prodErr;
        productId = product.id;

        // Clear existing ingredients (delete-reinsert pattern)
        const { error: delErr } = await supabase
          .from('product_ingredients')
          .delete()
          .eq('product_id', productId);
        if (delErr) throw delErr;
      } else {
        // Create new product or duplicate
        const { data: newProd, error: prodErr } = await supabase
          .from('products')
          .insert(productPayload)
          .select()
          .single();
        if (prodErr) throw prodErr;
        productId = newProd.id;
      }

      // Bulk insert ingredients
      const ingredientPayloads = ingredients.map(row => ({
        product_id: productId,
        stock_item_id: row.stockItemId,
        quantity: Number(row.quantity)
      }));

      const { error: ingErr } = await supabase
        .from('product_ingredients')
        .insert(ingredientPayloads);

      if (ingErr) throw ingErr;

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[#fffefb] border border-[#c5c0b1] rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#c5c0b1] bg-[#f8f4f0]">
          <h3 className="font-bold text-lg text-[#201515]">
            {product && !isDuplicate ? 'Edit Product & BOM' : 'Create Product Recipe'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white rounded-full transition border border-transparent hover:border-[#c5c0b1]">
            <X className="h-4 w-4 text-[#605d52]" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
                placeholder="e.g. Premium Gift Box"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Product Code (BOM SKU) *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
                placeholder="e.g. GB-PREM"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Selling Price ({currencySymbol}) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
                placeholder="e.g. 29.99"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
              placeholder="e.g. Luxury assortment of premium nuts, includes greeting ribbon..."
            />
          </div>

          {/* BOM Ingredients builder */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider">
                Bill of Materials (BOM Ingredients) *
              </label>
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1 text-xs text-[#ff4f00] hover:underline font-bold"
              >
                <Plus className="h-3 w-3" /> Add Ingredient
              </button>
            </div>

            <div className="space-y-3">
              {ingredients.map((row, index) => (
                <div key={index} className="flex gap-4 items-center">
                  <div className="flex-1">
                    <select
                      value={row.stockItemId}
                      required
                      onChange={(e) => handleRowChange(index, 'stockItemId', e.target.value)}
                      className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
                    >
                      <option value="">Select Stock Item...</option>
                      {stockItems.length === 0 && (
                        <option disabled value="empty">No stock items available — create one first</option>
                      )}
                      {stockItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.item_name} ({item.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32 flex items-center gap-2">
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      value={row.quantity}
                      onChange={(e) => handleRowChange(index, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
                      placeholder="Qty"
                    />
                    <span className="text-xs font-semibold text-[#605d52] min-w-[24px]">
                      {row.uomAbbr || '-'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-200"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#c5c0b1]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#c5c0b1] hover:bg-[#f8f4f0] text-sm font-semibold rounded-lg text-[#201515] bg-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#ff4f00] hover:bg-[#e04500] text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Saving Recipe...' : 'Save Product & BOM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
