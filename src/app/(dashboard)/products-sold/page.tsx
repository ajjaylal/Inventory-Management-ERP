'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, Trash2, Edit2 } from 'lucide-react';
import RecordSaleModal from '@/components/sales/RecordSaleModal';

interface Sale {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  sale_date: string;
  remarks: string | null;
  profiles: {
    full_name: string;
  } | null;
  sale_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    selling_price: number;
    products: {
      product_name: string;
    };
  }>;
}

export default function ProductsSoldPage() {
  const supabase = createClient();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          profiles(full_name),
          sale_items(
            id,
            product_id,
            quantity,
            selling_price,
            products(product_name)
          )
        `)
        .order('sale_date', { ascending: false });

      if (!error && data) {
        setSales(data as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currency');
      if (saved) {
        const match = saved.match(/\(([^)]+)\)/);
        if (match) setCurrencySymbol(match[1]);
      }
    }
  }, []);

  const handleDelete = async (sale: Sale) => {
    if (!confirm(`Are you sure you want to delete invoice #${sale.invoice_number}? This will restore all deducted inventory items.`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('delete_product_sale', {
        p_sale_id: sale.id,
        p_deleted_by: user?.id || null
      });

      if (error) throw error;
      fetchSales();
    } catch (err: any) {
      alert(err.message || 'Failed to delete sale.');
    }
  };

  const filteredSales = sales.filter(s => {
    const productName = s.sale_items?.[0]?.products?.product_name || '';
    return s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
           (s.customer_name && s.customer_name.toLowerCase().includes(search.toLowerCase())) ||
           productName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[#201515] tracking-tight">Products Sold</h1>
          <p className="text-sm text-[#605d52] mt-1">Record sales and monitor stock auto-deductions</p>
        </div>
        <button
          onClick={() => {
            setSelectedSale(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ff4f00] hover:bg-[#e04500] text-white text-sm font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          Record New Sale
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#f8f4f0] p-4 rounded-xl border border-[#c5c0b1]">
        {/* Search */}
        <div className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-[#939084]" />
            </span>
            <input
              type="text"
              placeholder="Search invoice number, product or customer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSearch(searchInput); }}
              className="w-full pl-10 pr-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
            />
          </div>
          <button
            onClick={() => setSearch(searchInput)}
            className="px-4 py-2 bg-[#ff4f00] hover:bg-[#e04500] text-white text-sm font-semibold rounded-lg transition"
          >
            Go
          </button>
        </div>
      </div>

      {/* Sales List Table */}
      <div className="bg-white border border-[#c5c0b1] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff4f00] mx-auto"></div>
            <p className="text-sm text-[#605d52]">Loading sales history...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-[#605d52]">No sales logged yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f4f0] border-b border-[#c5c0b1] text-xs font-bold text-[#605d52] uppercase tracking-wider">
                  <th className="py-4 px-6">Sale Date</th>
                  <th className="py-4 px-6">Invoice #</th>
                  <th className="py-4 px-6">Product Sold</th>
                  <th className="py-4 px-6 text-right">Quantity</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6 text-right">Revenue</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c0b1]">
                {filteredSales.map((s) => {
                  const item = s.sale_items?.[0];
                  const revenue = item ? item.quantity * item.selling_price : 0;
                  return (
                    <tr key={s.id} className="hover:bg-[#fffefb] text-sm text-[#201515]">
                      <td className="py-4 px-6 text-[#605d52]">
                        {new Date(s.sale_date).toLocaleDateString([], {
                          dateStyle: 'medium'
                        })}
                      </td>
                      <td className="py-4 px-6 font-semibold font-mono text-xs text-[#ff4f00]">{s.invoice_number}</td>
                      <td className="py-4 px-6 font-semibold">{item?.products?.product_name || 'Deleted Product'}</td>
                      <td className="py-4 px-6 text-right font-bold">{item?.quantity || 0}</td>
                      <td className="py-4 px-6 text-[#605d52]">{s.customer_name || 'Walk-in Customer'}</td>
                      <td className="py-4 px-6 text-right font-bold text-green-600">
                        {currencySymbol === 'AED' ? `AED ${revenue.toFixed(2)}` : `${currencySymbol}${revenue.toFixed(2)}`}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSale(s);
                            setIsModalOpen(true);
                          }}
                          title="Edit Sale"
                          className="p-1.5 hover:bg-[#f8f4f0] rounded-lg border border-[#c5c0b1] transition inline-flex"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-[#605d52]" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          title="Delete Sale / Restore Inventory"
                          className="p-1.5 hover:bg-red-50 hover:text-red-700 rounded-lg border border-red-200 transition inline-flex"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <RecordSaleModal
          sale={selectedSale}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchSales();
          }}
        />
      )}
    </div>
  );
}
