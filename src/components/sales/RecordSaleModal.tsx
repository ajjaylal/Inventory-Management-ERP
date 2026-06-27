'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, AlertTriangle } from 'lucide-react';

interface Product {
  id: string;
  product_name: string;
  product_code: string;
  selling_price: number;
  product_ingredients: Array<{
    quantity: number;
    stock_items: {
      item_name: string;
      cached_quantity: number;
      units_of_measure: {
        abbreviation: string;
      };
    };
  }>;
}

interface Sale {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  remarks: string | null;
  sale_items: Array<{
    product_id: string;
    quantity: number;
  }>;
}

interface Props {
  sale: Sale | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RecordSaleModal({ sale, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select(`
          id, product_name, product_code, selling_price,
          product_ingredients(
            quantity,
            stock_items(
              item_name,
              cached_quantity,
              units_of_measure(abbreviation)
            )
          )
        `)
        .eq('status', 'Active');
      if (data) setProducts(data as any);
    };

    loadProducts();

    if (sale) {
      setProductId(sale.sale_items?.[0]?.product_id || '');
      setQuantity(String(sale.sale_items?.[0]?.quantity || 1));
      setInvoiceNumber(sale.invoice_number);
      setCustomerName(sale.customer_name || '');
      setRemarks(sale.remarks || '');
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currency');
      if (saved) {
        const match = saved.match(/\(([^)]+)\)/);
        if (match) setCurrencySymbol(match[1]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale]);

  const selectedProduct = products.find(p => p.id === productId);
  const numQty = Number(quantity) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const qtyVal = Number(quantity);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setErrorMsg('Quantity must be a positive integer.');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (sale) {
        // Edit mode using RPC
        const { error } = await supabase.rpc('update_product_sale', {
          p_sale_id: sale.id,
          p_product_id: productId,
          p_quantity: qtyVal,
          p_customer_name: customerName || null,
          p_remarks: remarks || null,
          p_updated_by: user?.id || null
        });

        if (error) throw error;
      } else {
        // Create mode using RPC
        const { error } = await supabase.rpc('record_product_sale', {
          p_product_id: productId,
          p_quantity: qtyVal,
          p_customer_name: customerName || null,
          p_invoice_number: invoiceNumber,
          p_remarks: remarks || null,
          p_created_by: user?.id || null
        });

        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record sale.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[#fffefb] border border-[#c5c0b1] rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#c5c0b1] bg-[#f8f4f0]">
          <h3 className="font-bold text-lg text-[#201515]">
            {sale ? 'Edit Sale Details' : 'Record Product Sale'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white rounded-full transition border border-transparent hover:border-[#c5c0b1]">
            <X className="h-4 w-4 text-[#605d52]" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                disabled={!!sale}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] disabled:bg-[#f8f4f0] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
                placeholder="Walk-in Customer"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Select Product *
              </label>
              <select
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
              >
                <option value="">Choose product...</option>
                {products.length === 0 && (
                  <option disabled value="empty">No products available — create one first</option>
                )}
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.product_name} ({currencySymbol === 'AED' ? `AED ${Number(p.selling_price).toFixed(2)}` : `${currencySymbol}${Number(p.selling_price).toFixed(2)}`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
                Qty Sold *
              </label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
              />
            </div>
          </div>

          {/* Real-time Ingredient Stock Checker */}
          {selectedProduct && (
            <div className="bg-[#f8f4f0] p-4 rounded-xl border border-[#c5c0b1] space-y-3">
              <h4 className="text-xs font-bold text-[#605d52] uppercase tracking-wider">
                Ingredient Stock Check (for {numQty} Boxes)
              </h4>
              <div className="space-y-2">
                {selectedProduct.product_ingredients?.map((ing, i) => {
                  const required = ing.quantity * numQty;
                  const available = ing.stock_items?.cached_quantity || 0;
                  const shortage = required - available;
                  const hasShortage = shortage > 0;
                  const abbr = ing.stock_items?.units_of_measure?.abbreviation || '';

                  return (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-[#201515]">{ing.stock_items?.item_name}</span>
                      <div className="flex gap-4">
                        <span className="text-[#605d52]">Req: {required}{abbr}</span>
                        <span className={hasShortage ? 'text-red-600 font-bold flex items-center gap-1' : 'text-green-600 font-semibold'}>
                          {hasShortage && <AlertTriangle className="h-3.5 w-3.5 text-red-500 animate-pulse" />}
                          Avail: {available}{abbr} {hasShortage && `(Short by ${shortage}${abbr})`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#605d52] uppercase tracking-wider mb-2">
              Remarks / Comments
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
              placeholder="e.g. Standard gift packaging requested..."
            />
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
              {loading ? 'Processing Sale...' : 'Record Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
