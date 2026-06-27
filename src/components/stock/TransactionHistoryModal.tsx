'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';

interface Transaction {
  id: string;
  transaction_type: string;
  quantity: number;
  remarks: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

interface StockItem {
  id: string;
  item_name: string;
  units_of_measure: {
    abbreviation: string;
  };
}

interface Props {
  item: StockItem;
  onClose: () => void;
}

export default function TransactionHistoryModal({ item, onClose }: Props) {
  const supabase = createClient();
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const { data, error } = await supabase
          .from('stock_transactions')
          .select('id, transaction_type, quantity, remarks, created_at, profiles(full_name)')
          .eq('stock_item_id', item.id)
          .order('created_at', { ascending: false });

        if (error) {
          setErrorMsg('Failed to load history. ' + error.message);
        } else if (data) {
          setHistory(data as any);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to load history. ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[#fffefb] border border-[#c5c0b1] rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#c5c0b1] bg-[#f8f4f0]">
          <div>
            <h3 className="font-bold text-lg text-[#201515]">Ledger History</h3>
            <p className="text-xs text-[#605d52] mt-0.5">{item.item_name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white rounded-full transition border border-transparent hover:border-[#c5c0b1]">
            <X className="h-4 w-4 text-[#605d52]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff4f00] mx-auto"></div>
              <p className="text-sm text-[#605d52]">Loading transaction logs...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-[#605d52]">No transaction records found for this item.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8f4f0] border-b border-[#c5c0b1] text-[#605d52] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date/Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c5c0b1]">
                  {history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#fffefb] text-[#201515]">
                      <td className="py-3 px-4 text-[#605d52] whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${
                          tx.transaction_type.startsWith('Stock In') || tx.transaction_type === 'Returned Stock'
                            ? 'bg-green-50 text-green-700'
                            : tx.transaction_type === 'Initial Stock'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${tx.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.quantity >= 0 ? `+${tx.quantity}` : `${tx.quantity}`} {item.units_of_measure.abbreviation}
                      </td>
                      <td className="py-3 px-4 text-[#605d52] font-semibold">{tx.profiles?.full_name || 'System'}</td>
                      <td className="py-3 px-4 text-[#605d52] max-w-xs truncate" title={tx.remarks || ''}>
                        {tx.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#c5c0b1] bg-[#f8f4f0] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#c5c0b1] hover:bg-white text-sm font-semibold rounded-lg text-[#201515] bg-[#fffefb] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
