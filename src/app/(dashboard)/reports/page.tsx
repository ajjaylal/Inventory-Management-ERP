'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  BarChart3, 
  Calendar, 
  FileSpreadsheet, 
  Boxes, 
  AlertTriangle,
  FileText
} from 'lucide-react';

interface StockItem {
  id: string;
  item_name: string;
  category: string;
  cached_quantity: number;
  low_stock_level: number;
  status: string;
  units_of_measure: {
    abbreviation: string;
  };
}

interface TransactionReportItem {
  id: string;
  item_name: string;
  transaction_type: string;
  quantity: number;
  created_at: string;
  remarks: string | null;
  user_name: string | null;
}

interface ConsumptionItem {
  item_name: string;
  category: string;
  total_consumed: number;
  abbreviation: string;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'inventory' | 'movement' | 'consumption'>('inventory');
  const [loading, setLoading] = useState(true);

  // Data states
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<TransactionReportItem[]>([]);
  const [consumption, setConsumption] = useState<ConsumptionItem[]>([]);

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const loadInventoryReport = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stock_items')
      .select('*, units_of_measure(abbreviation)')
      .order('item_name');
    if (data) setInventory(data as any);
    setLoading(false);
  };

  const loadMovementReport = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stock_transactions')
      .select(`
        id, transaction_type, quantity, remarks, created_at,
        stock_items(item_name),
        profiles(full_name)
      `)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`)
      .order('created_at', { ascending: false });

    if (data) {
      const mapped = data.map((t: any) => ({
        id: t.id,
        item_name: t.stock_items?.item_name || 'Deleted Item',
        transaction_type: t.transaction_type,
        quantity: t.quantity,
        created_at: t.created_at,
        remarks: t.remarks,
        user_name: t.profiles?.full_name || 'System'
      }));
      setMovements(mapped);
    }
    setLoading(false);
  };

  const loadConsumptionReport = async () => {
    setLoading(true);
    // Fetch total consumed ingredient quantities (where transaction_type = 'Stock Out' and reference_type = 'Sale')
    const { data } = await supabase
      .from('stock_transactions')
      .select(`
        quantity,
        stock_items(
          item_name,
          category,
          units_of_measure(abbreviation)
        )
      `)
      .eq('transaction_type', 'Stock Out')
      .eq('reference_type', 'Sale')
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`);

    if (data) {
      const aggregates: Record<string, { name: string; category: string; sum: number; abbr: string }> = {};
      data.forEach((t: any) => {
        const name = t.stock_items?.item_name || 'Unknown Item';
        const category = t.stock_items?.category || 'Consumable';
        const abbr = t.stock_items?.units_of_measure?.abbreviation || '';
        const qty = Math.abs(t.quantity); // Deductions are negative

        if (!aggregates[name]) {
          aggregates[name] = { name, category, sum: 0, abbr };
        }
        aggregates[name].sum += qty;
      });

      const list = Object.values(aggregates).map(item => ({
        item_name: item.name,
        category: item.category,
        total_consumed: item.sum,
        abbreviation: item.abbr
      }));
      setConsumption(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadInventoryReport();
    } else if (activeTab === 'movement') {
      loadMovementReport();
    } else if (activeTab === 'consumption') {
      loadConsumptionReport();
    }
  }, [activeTab, startDate, endDate]);

  const exportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (activeTab === 'inventory') {
      filename = 'inventory-report.csv';
      headers = ['Item Name', 'Category', 'Current Stock', 'Low Threshold', 'Status'];
      rows = inventory.map(item => [
        item.item_name,
        item.category,
        `${item.cached_quantity} ${item.units_of_measure.abbreviation}`,
        `${item.low_stock_level} ${item.units_of_measure.abbreviation}`,
        item.status
      ]);
    } else if (activeTab === 'movement') {
      filename = `movement-report-${startDate}-to-${endDate}.csv`;
      headers = ['Date', 'Item Name', 'Transaction Type', 'Quantity', 'User', 'Remarks'];
      rows = movements.map(t => [
        new Date(t.created_at).toLocaleString(),
        t.item_name,
        t.transaction_type,
        String(t.quantity),
        t.user_name || 'System',
        t.remarks || ''
      ]);
    } else {
      filename = `consumption-report-${startDate}-to-${endDate}.csv`;
      headers = ['Ingredient Name', 'Category', 'Total Consumed Quantity'];
      rows = consumption.map(c => [
        c.item_name,
        c.category,
        `${c.total_consumed} ${c.abbreviation}`
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[#201515] tracking-tight">Reports & Ledger</h1>
          <p className="text-sm text-[#605d52] mt-1">Audit trail & ingredient statistics</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-[#c5c0b1] hover:bg-[#f8f4f0] text-sm font-semibold rounded-lg text-[#201515] bg-white transition"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#c5c0b1] pb-px">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'inventory'
              ? 'border-[#ff4f00] text-[#ff4f00]'
              : 'border-transparent text-[#605d52] hover:text-[#201515]'
          }`}
        >
          <Boxes className="h-4 w-4" />
          Current Inventory
        </button>

        <button
          onClick={() => setActiveTab('movement')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'movement'
              ? 'border-[#ff4f00] text-[#ff4f00]'
              : 'border-transparent text-[#605d52] hover:text-[#201515]'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Stock Movement Ledger
        </button>

        <button
          onClick={() => setActiveTab('consumption')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all ${
            activeTab === 'consumption'
              ? 'border-[#ff4f00] text-[#ff4f00]'
              : 'border-transparent text-[#605d52] hover:text-[#201515]'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Ingredient Consumption
        </button>
      </div>

      {/* Date Pickers (only show for date-range reports) */}
      {activeTab !== 'inventory' && (
        <div className="flex gap-4 bg-[#f8f4f0] p-4 rounded-xl border border-[#c5c0b1] items-center text-sm">
          <span className="font-bold text-[#605d52] uppercase tracking-wider text-xs">Date Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none"
            />
            <span className="text-[#605d52] font-semibold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-[#c5c0b1] rounded-lg text-sm bg-white text-[#201515] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Report Table */}
      <div className="bg-white border border-[#c5c0b1] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff4f00] mx-auto"></div>
            <p className="text-sm text-[#605d52]">Generating report data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'inventory' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8f4f0] border-b border-[#c5c0b1] text-xs font-bold text-[#605d52] uppercase tracking-wider">
                    <th className="py-4 px-6">Ingredient Name</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6 text-right">Available Quantity</th>
                    <th className="py-4 px-6 text-right">Low Stock Threshold</th>
                    <th className="py-4 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c5c0b1]">
                  {inventory.map((item) => {
                    const isLow = item.cached_quantity <= item.low_stock_level;
                    return (
                      <tr key={item.id} className="hover:bg-[#fffefb] text-sm text-[#201515]">
                        <td className="py-4 px-6 font-semibold">{item.item_name}</td>
                        <td className="py-4 px-6 text-[#605d52]">{item.category}</td>
                        <td className={`py-4 px-6 text-right font-bold ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                          <span className="inline-flex items-center gap-1.5 justify-end">
                            {isLow && <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />}
                            {item.cached_quantity} {item.units_of_measure.abbreviation}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-[#605d52]">
                          {item.low_stock_level} {item.units_of_measure.abbreviation}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'movement' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8f4f0] border-b border-[#c5c0b1] text-xs font-bold text-[#605d52] uppercase tracking-wider">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Stock Item</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6 text-right">Signed Quantity</th>
                    <th className="py-4 px-6">User</th>
                    <th className="py-4 px-6">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c5c0b1]">
                  {movements.map((t) => (
                    <tr key={t.id} className="hover:bg-[#fffefb] text-sm text-[#201515]">
                      <td className="py-4 px-6 text-[#605d52]">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 font-semibold">{t.item_name}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          t.transaction_type.startsWith('Stock In') || t.transaction_type === 'Returned Stock'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {t.transaction_type}
                        </span>
                      </td>
                      <td className={`py-4 px-6 text-right font-bold ${t.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.quantity >= 0 ? `+${t.quantity}` : `${t.quantity}`}
                      </td>
                      <td className="py-4 px-6 font-semibold text-[#605d52]">{t.user_name || 'System'}</td>
                      <td className="py-4 px-6 text-[#605d52] max-w-xs truncate" title={t.remarks || ''}>
                        {t.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'consumption' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8f4f0] border-b border-[#c5c0b1] text-xs font-bold text-[#605d52] uppercase tracking-wider">
                    <th className="py-4 px-6">Ingredient Name</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6 text-right">Total Consumed (for Sales)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c5c0b1]">
                  {consumption.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-[#605d52]">
                        No consumption logs for this date range.
                      </td>
                    </tr>
                  ) : (
                    consumption.map((c, i) => (
                      <tr key={i} className="hover:bg-[#fffefb] text-sm text-[#201515]">
                        <td className="py-4 px-6 font-semibold">{c.item_name}</td>
                        <td className="py-4 px-6 text-[#605d52]">{c.category}</td>
                        <td className="py-4 px-6 text-right font-bold text-red-600">
                          {c.total_consumed} {c.abbreviation}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
