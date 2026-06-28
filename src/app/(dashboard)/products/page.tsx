'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, Trash2, Edit2, Copy } from 'lucide-react';
import CreateProductModal from '@/components/products/CreateProductModal';
import { useUserRole } from '@/hooks/useUserRole';

interface Product {
  id: string;
  product_name: string;
  product_code: string;
  description: string | null;
  selling_price: number;
  status: 'Active' | 'Inactive' | 'Archived';
  created_at: string;
  product_ingredients: Array<{
    id: string;
    stock_item_id: string;
    quantity: number;
    stock_items: {
      item_name: string;
    };
  }>;
}

export default function ProductsPage() {
  const supabase = createClient();
  const { isAdmin } = useUserRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_ingredients(
            id,
            stock_item_id,
            quantity,
            stock_items(item_name)
          )
        `)
        .neq('status', 'Archived') // Don't list archived products
        .order('product_name');

      if (!error && data) {
        setProducts(data as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currency');
      if (saved) {
        const match = saved.match(/\(([^)]+)\)/);
        if (match) setCurrencySymbol(match[1]);
      }
    }
  }, []);

  const archiveProduct = async (id: string) => {
    if (!confirm('Are you sure you want to archive this product? This will make it inactive for future sales but preserve historical sales records.')) {
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ status: 'Archived' })
      .eq('id', id);

    if (!error) {
      fetchProducts();
    } else {
      alert('Cannot delete/archive this product if it is linked to sales. Please archive it from edit form instead.');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.product_name.toLowerCase().includes(search.toLowerCase()) ||
                          p.product_code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[#201515] tracking-tight">Product Catalog (BOM)</h1>
          <p className="text-sm text-[#605d52] mt-1">Manage finished gift boxes and recipes</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setSelectedProduct(null);
              setIsDuplicate(false);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ff4f00] hover:bg-[#e04500] text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Create Product
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#f8f4f0] p-4 rounded-xl border border-[#c5c0b1]">
        {/* Search */}
        <div className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-[#939084]" />
            </span>
            <input
              type="text"
              placeholder="Search product name or code..."
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

      {/* Grid List */}
      <div className="bg-white border border-[#c5c0b1] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff4f00] mx-auto"></div>
            <p className="text-sm text-[#605d52]">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-[#605d52]">No products found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f4f0] border-b border-[#c5c0b1] text-xs font-bold text-[#605d52] uppercase tracking-wider">
                  <th className="py-4 px-6">Product Code</th>
                  <th className="py-4 px-6">Product Name</th>
                  <th className="py-4 px-6 text-right">Selling Price</th>
                  <th className="py-4 px-6 text-center">Ingredients</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c0b1]">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#fffefb] text-sm text-[#201515]">
                    <td className="py-4 px-6 font-semibold font-mono text-xs">{p.product_code}</td>
                    <td className="py-4 px-6 font-semibold">{p.product_name}</td>
                    <td className="py-4 px-6 text-right font-bold">
                      {currencySymbol === 'AED' ? `AED ${Number(p.selling_price).toFixed(2)}` : `${currencySymbol}${Number(p.selling_price).toFixed(2)}`}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="bg-[#f8f4f0] border border-[#c5c0b1] px-2.5 py-1 rounded-full text-xs font-semibold text-[#605d52]">
                        {p.product_ingredients?.length || 0} items
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setIsDuplicate(false);
                            setIsModalOpen(true);
                          }}
                          title="Edit Product & BOM"
                          className="p-1.5 hover:bg-[#f8f4f0] rounded-lg border border-[#c5c0b1] transition inline-flex"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-[#605d52]" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setIsDuplicate(true);
                            setIsModalOpen(true);
                          }}
                          title="Duplicate Recipe"
                          className="p-1.5 hover:bg-[#f8f4f0] rounded-lg border border-[#c5c0b1] transition inline-flex"
                        >
                          <Copy className="h-3.5 w-3.5 text-[#ff4f00]" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => archiveProduct(p.id)}
                          title="Archive Product"
                          className="p-1.5 hover:bg-red-50 hover:text-red-700 rounded-lg border border-red-200 transition inline-flex"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <CreateProductModal
          product={selectedProduct}
          isDuplicate={isDuplicate}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
