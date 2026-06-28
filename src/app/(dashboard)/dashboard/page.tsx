'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Boxes, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  total_stock_items: number;
  total_products: number;
  low_stock_items: number;
  sales_today: number;
  sales_month: number;
  recent_transactions: Array<{
    id: string;
    transaction_type: string;
    quantity: number;
    created_at: string;
    item_name: string;
    user_name: string | null;
  }>;
  recent_sales: Array<{
    id: string;
    invoice_number: string;
    customer_name: string | null;
    sale_date: string;
    product_name: string;
    quantity: number;
  }>;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: stats, error } = await supabase.rpc('get_dashboard_stats');
      if (!error && stats) {
        setData(stats as DashboardData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-[#f8f4f0] animate-pulse rounded-lg"></div>
          <div className="h-10 w-24 bg-[#f8f4f0] animate-pulse rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-[#f8f4f0] animate-pulse rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <div className="h-96 bg-[#f8f4f0] animate-pulse rounded-xl"></div>
          <div className="h-96 bg-[#f8f4f0] animate-pulse rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[#201515] tracking-tight">Overview</h1>
          <p className="text-sm text-[#605d52] mt-1">Real-time operations & inventory logs</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 border border-[#c5c0b1] hover:bg-[#f8f4f0] text-sm font-semibold rounded-lg text-[#201515] bg-white transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link href="/stock" className="bg-[#f8f4f0] p-6 rounded-xl border border-[#c5c0b1] flex items-center justify-between hover:border-[#ff4f00] hover:shadow-sm transition cursor-pointer">
          <div>
            <span className="text-xs font-bold text-[#605d52] uppercase tracking-wider">Total Stock Items</span>
            <h3 className="text-3xl font-bold text-[#201515] mt-2">{data?.total_stock_items || 0}</h3>
          </div>
          <div className="p-3 bg-white border border-[#c5c0b1] rounded-lg">
            <Boxes className="h-6 w-6 text-[#ff4f00]" />
          </div>
        </Link>

        <Link href="/products" className="bg-[#f8f4f0] p-6 rounded-xl border border-[#c5c0b1] flex items-center justify-between hover:border-[#ff4f00] hover:shadow-sm transition cursor-pointer">
          <div>
            <span className="text-xs font-bold text-[#605d52] uppercase tracking-wider">Active Products</span>
            <h3 className="text-3xl font-bold text-[#201515] mt-2">{data?.total_products || 0}</h3>
          </div>
          <div className="p-3 bg-white border border-[#c5c0b1] rounded-lg">
            <Package className="h-6 w-6 text-[#ff4f00]" />
          </div>
        </Link>

        <Link href="/stock" className="bg-[#f8f4f0] p-6 rounded-xl border border-[#c5c0b1] flex items-center justify-between hover:border-[#ff4f00] hover:shadow-sm transition cursor-pointer">
          <div>
            <span className="text-xs font-bold text-[#605d52] uppercase tracking-wider">Low Stock Items</span>
            <h3 className="text-3xl font-bold text-[#201515] mt-2">{data?.low_stock_items || 0}</h3>
          </div>
          <div className="p-3 bg-white border border-[#c5c0b1] rounded-lg">
            <AlertTriangle className={`h-6 w-6 ${(data?.low_stock_items || 0) > 0 ? 'text-red-500 animate-bounce' : 'text-[#605d52]'}`} />
          </div>
        </Link>

        <Link href="/products-sold" className="bg-[#f8f4f0] p-6 rounded-xl border border-[#c5c0b1] flex items-center justify-between hover:border-[#ff4f00] hover:shadow-sm transition cursor-pointer">
          <div>
            <span className="text-xs font-bold text-[#605d52] uppercase tracking-wider">Sold Today</span>
            <h3 className="text-3xl font-bold text-[#201515] mt-2">{data?.sales_today || 0} boxes</h3>
          </div>
          <div className="p-3 bg-white border border-[#c5c0b1] rounded-lg">
            <TrendingUp className="h-6 w-6 text-[#ff4f00]" />
          </div>
        </Link>
      </div>

      {/* Activity Logs & Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Sales */}
        <div className="bg-white border border-[#c5c0b1] rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-[#201515]">Recent Sales</h3>
            <Link href="/products-sold" className="text-xs text-[#ff4f00] hover:underline flex items-center gap-1 font-semibold">
              View All Sales
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#c5c0b1]">
            {(!data?.recent_sales || data.recent_sales.length === 0) ? (
              <p className="text-sm text-[#605d52] py-8 text-center bg-[#f8f4f0] rounded-lg border border-dashed border-[#c5c0b1]">
                No sales recorded yet.
              </p>
            ) : (
              data.recent_sales.map((sale) => (
                <div key={sale.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-[#201515]">{sale.product_name}</p>
                    <p className="text-xs text-[#605d52] mt-0.5">
                      Inv #{sale.invoice_number} • {sale.customer_name || 'Walk-in Customer'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#ff4f00]">+{sale.quantity} Box</p>
                    <p className="text-[10px] text-[#939084] mt-0.5">
                      {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white border border-[#c5c0b1] rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-[#201515]">Inventory Ledger Feed</h3>
            <Link href="/stock" className="text-xs text-[#ff4f00] hover:underline flex items-center gap-1 font-semibold">
              Manage Stock
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#c5c0b1]">
            {(!data?.recent_transactions || data.recent_transactions.length === 0) ? (
              <p className="text-sm text-[#605d52] py-8 text-center bg-[#f8f4f0] rounded-lg border border-dashed border-[#c5c0b1]">
                No stock transactions logged yet.
              </p>
            ) : (
              data.recent_transactions.map((t) => (
                <div key={t.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-[#201515]">{t.item_name}</p>
                    <p className="text-xs text-[#605d52] mt-0.5">
                      Type: {t.transaction_type} • By {t.user_name || 'System'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${t.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.quantity >= 0 ? `+${t.quantity}` : `${t.quantity}`}
                    </p>
                    <p className="text-[10px] text-[#939084] mt-0.5">
                      {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
