'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Plus, 
  Search, 
  ArrowUpDown, 
  History, 
  TrendingUp, 
  AlertTriangle,
  Edit2,
  Trash2
} from 'lucide-react';
import CreateStockItemModal from '@/components/stock/CreateStockItemModal';
import RecordTransactionModal from '@/components/stock/RecordTransactionModal';
import TransactionHistoryModal from '@/components/stock/TransactionHistoryModal';

interface StockItem {
  id: string;
  item_name: string;
  category: string;
  description: string | null;
  cached_quantity: number;
  low_stock_level: number;
  status: 'Active' | 'Inactive';
  uom_id: string;
  units_of_measure: {
    name: string;
    abbreviation: string;
  };
}

interface UOM {
  id: string;
  name: string;
  abbreviation: string;
}

export default function StockPage() {
  const supabase = createClient();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch UOMs
      const { data: uomData, error: uomErr } = await supabase
        .from('units_of_measure')
        .select('*')
        .order('name');
      if (uomErr) {
        console.error('UOM fetch failed:', uomErr);
        setErrorMsg('Failed to load UOMs. Please check authentication or try refreshing.');
      }
      if (uomData) setUoms(uomData);

      // Fetch Stock Items
      const { data: stockData } = await supabase
        .from('stock_items')
        .select('*, units_of_measure(name, abbreviation)')
        .order('item_name');
      if (stockData) setStockItems(stockData as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleStatus = async (item: StockItem) => {
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    const { error } = await supabase
      .from('stock_items')
      .update({ status: newStatus })
      .eq('id', item.id);
    if (!error) {
      fetchData();
    }
  };

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(search.toLowerCase())) ||
                          item.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    const matchesStatus = statusFilter ? item.status === statusFilter : true;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(stockItems.map(item => item.category)));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[#201515] tracking-tight">Stock Management</h1>
          <p className="text-sm text-[#605d52] mt-1">Manage raw materials & ingredients</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSelectedItem(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ff4f00] hover:bg-[#e04500] text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Add Stock Item
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#f8f4f0] p-4 rounded-xl border border-[#c5c0b1]">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-[#939084]" />
          </span>
          <input
            type="text"
            placeholder="Search item name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none focus:ring-1 focus:ring-[#ff4f00]"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {errorMsg}
        </div>
      )}

      {/* Grid List Table */}
      <div className="bg-white border border-[#c5c0b1] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff4f00] mx-auto"></div>
            <p className="text-sm text-[#605d52]">Loading stock inventory...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-[#605d52]">No stock items found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f4f0] border-b border-[#c5c0b1] text-xs font-bold text-[#605d52] uppercase tracking-wider">
                  <th className="py-4 px-6">Item Name</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6 text-right">Current Stock</th>
                  <th className="py-4 px-6 text-right">Low Stock Threshold</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c0b1]">
                {filteredItems.map((item) => {
                  const isLowStock = item.cached_quantity <= item.low_stock_level;
                  return (
                    <tr key={item.id} className="hover:bg-[#fffefb] text-sm text-[#201515]">
                      <td className="py-4 px-6 font-semibold">{item.item_name}</td>
                      <td className="py-4 px-6 text-[#605d52]">{item.category}</td>
                      <td className="py-4 px-6 text-right font-bold">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {isLowStock && item.status === 'Active' && (
                            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                          )}
                          <span className={isLowStock && item.status === 'Active' ? 'text-red-600' : ''}>
                            {item.cached_quantity} {item.units_of_measure.abbreviation}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-[#605d52]">
                        {item.low_stock_level} {item.units_of_measure.abbreviation}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsCreateOpen(true);
                          }}
                          title="Edit Item"
                          className="p-1.5 hover:bg-[#f8f4f0] rounded-lg border border-[#c5c0b1] transition inline-flex"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-[#605d52]" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsTxOpen(true);
                          }}
                          title="Record Transaction"
                          className="p-1.5 hover:bg-[#f8f4f0] rounded-lg border border-[#c5c0b1] transition inline-flex"
                        >
                          <TrendingUp className="h-3.5 w-3.5 text-[#ff4f00]" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsHistoryOpen(true);
                          }}
                          title="View Ledger History"
                          className="p-1.5 hover:bg-[#f8f4f0] rounded-lg border border-[#c5c0b1] transition inline-flex"
                        >
                          <History className="h-3.5 w-3.5 text-[#605d52]" />
                        </button>
                        <button
                          onClick={() => toggleStatus(item)}
                          className={`text-xs font-semibold px-2 py-1.5 rounded-lg border transition ${
                            item.status === 'Active' 
                              ? 'border-red-200 text-red-600 hover:bg-red-50' 
                              : 'border-green-200 text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {item.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Are you sure you want to delete this item?')) return;
                            const { error } = await supabase.from('stock_items').delete().eq('id', item.id);
                            if (error) alert('Cannot delete — ledger entries exist. Please deactivate instead.');
                            else fetchData();
                          }}
                          title="Delete Item"
                          className="p-1.5 hover:bg-red-50 hover:text-red-700 rounded-lg border border-[#c5c0b1] hover:border-red-200 transition inline-flex"
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

      {/* Modals */}
      {isCreateOpen && (
        <CreateStockItemModal
          item={selectedItem}
          uoms={uoms}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            fetchData();
          }}
        />
      )}

      {isTxOpen && selectedItem && (
        <RecordTransactionModal
          item={selectedItem}
          onClose={() => setIsTxOpen(false)}
          onSuccess={() => {
            setIsTxOpen(false);
            fetchData();
          }}
        />
      )}

      {isHistoryOpen && selectedItem && (
        <TransactionHistoryModal
          item={selectedItem}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
    </div>
  );
}
