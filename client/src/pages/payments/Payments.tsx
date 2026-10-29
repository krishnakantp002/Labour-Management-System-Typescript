import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { 
  IndianRupee, 
  CreditCard, 
  Banknote, 
  History, 
  Wallet, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Trash2,
  RefreshCw 
} from 'lucide-react';

interface PendingPayment {
  worker_id: string; // The UUID
  human_id: string; // The readable ID (e.g., WRK-001)
  name: string;
  total_earned: number;
  total_paid: number;
  balance_due: number;
}

interface PaymentHistory {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_code: string;
  amount: string;
  method: 'CASH' | 'UPI' | 'BANK';
  reference: string | null;
  payment_date: string;
  paid_by_id: string;
  paid_by_name?: string;
  remarks: string | null;
  created_at: string;
}

function getTodayLocalDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Payments() {
  const queryClient = useQueryClient();

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isAdmin = currentUser?.role === 'ADMIN';

  // Modal State - simple worker settlement
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<PendingPayment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'CASH' as 'CASH' | 'UPI' | 'BANK',
    reference: '',
    remarks: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Search filters
  const [pendingSearch, setPendingSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Fetch Pending Balances
  const { 
    data: pendingBalances = [], 
    isLoading, 
    isError: isPendingError, 
    error: pendingError,
    refetch: refetchPending
  } = useQuery({
    queryKey: ['payments-pending'],
    queryFn: async () => {
      const res = await api.get('/payments/pending');
      const workers = res.data.data.workers || [];
      return workers.map((w: any) => ({
        worker_id: w.worker_id,
        human_id: w.worker_code,
        name: w.worker_name,
        total_earned: Number(w.total_earned),
        total_paid: Number(w.total_paid),
        balance_due: Number(w.balance)
      })) as PendingPayment[];
    }
  });

  // 2. Fetch Payment History
  const { 
    data: history = [], 
    isLoading: isHistoryLoading, 
    isError: isHistoryError, 
    error: historyError,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['payments-history'],
    queryFn: async () => {
      const res = await api.get('/payments?limit=100');
      return (res.data.data || []) as PaymentHistory[];
    }
  });

  // Process Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorker) return;
      const numAmount = Number(paymentForm.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Please enter a valid amount greater than 0');
      }

      await api.post('/payments', {
        workerId: selectedWorker.worker_id,
        amount: Math.round(numAmount * 100) / 100,
        method: paymentForm.method,
        reference: paymentForm.reference.trim() || undefined,
        remarks: paymentForm.remarks.trim() || undefined,
        paymentDate: getTodayLocalDate()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-pending'] });
      queryClient.invalidateQueries({ queryKey: ['payments-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setIsModalOpen(false);
      setSelectedWorker(null);
      setFormError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to record payment';
      setFormError(msg);
    }
  });

  // Delete Payment Mutation (Admin only)
  const deleteMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await api.delete(`/payments/${paymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-pending'] });
      queryClient.invalidateQueries({ queryKey: ['payments-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setDeletingId(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to delete payment';
      alert(`Error: ${msg}`);
      setDeletingId(null);
    }
  });

  // Open the simple payment modal for a worker
  const handleOpenPay = (worker: PendingPayment) => {
    setSelectedWorker(worker);
    setPaymentForm({
      amount: worker.balance_due > 0 ? String(worker.balance_due) : '',
      method: 'CASH',
      reference: '',
      remarks: ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const totalOwed = useMemo(() => {
    return pendingBalances.reduce((sum, w) => sum + Math.max(0, Number(w.balance_due)), 0);
  }, [pendingBalances]);

  const filteredPending = useMemo(() => {
    const q = pendingSearch.trim().toLowerCase();
    return pendingBalances.filter(w => {
      if (Number(w.balance_due) <= 0) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.human_id.toLowerCase().includes(q)
      );
    });
  }, [pendingBalances, pendingSearch]);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return history;
    return history.filter(p => (
      p.worker_name.toLowerCase().includes(q) ||
      p.worker_code.toLowerCase().includes(q) ||
      (p.reference && p.reference.toLowerCase().includes(q))
    ));
  }, [history, historySearch]);

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in space-y-8">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Payments & Ledger</h1>
          <p className="text-slate-500 mt-1">Settle outstanding balances and track worker payouts.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Outstanding</p>
            <p className="text-2xl font-bold text-slate-900">₹{totalOwed.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Error banner if network/auth fails */}
      {(isPendingError || isHistoryError) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Failed to load payments</p>
              <p className="text-xs text-rose-600">
                {(pendingError as any)?.response?.data?.message ||
                 (historyError as any)?.response?.data?.message ||
                 'Unable to fetch payment records.'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-rose-300 text-rose-700 hover:bg-rose-100 gap-1 cursor-pointer"
            onClick={() => {
              refetchPending();
              refetchHistory();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* ─── Pending Settlements ────────────────────────────────── */}
      <div className="glass p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Pending Settlements</h2>
              <p className="text-xs text-slate-400">Workers with positive unpaid balances</p>
            </div>
          </div>

          {pendingBalances.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter worker..."
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading balances...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm">Worker</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm text-right">Total Earned</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm text-right">Total Paid</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm text-right">Balance Due</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((worker) => (
                  <tr key={worker.worker_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-4">
                      <p className="font-semibold text-slate-800">{worker.name}</p>
                      <p className="text-xs text-slate-400 font-medium">{worker.human_id}</p>
                    </td>
                    <td className="py-4 px-4 text-right text-slate-600 font-medium">₹{worker.total_earned.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-4 text-right text-slate-600 font-medium">₹{worker.total_paid.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-4 text-right font-bold text-rose-600">₹{worker.balance_due.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-4 text-right">
                      <Button 
                        onClick={() => handleOpenPay(worker)}
                        className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 text-white cursor-pointer"
                        size="sm"
                      >
                        Process Payment
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredPending.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      {pendingSearch ? (
                        <span>No workers matching "{pendingSearch}"</span>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          <p className="font-semibold text-slate-700">All settled up!</p>
                          <p className="text-xs text-slate-400">There are no pending dues across all workers.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Recent Payment History ─────────────────────────────── */}
      <div className="glass p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" />
            Recent Payments
          </h2>

          {history.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
              />
            </div>
          )}
        </div>

        {isHistoryLoading ? (
          <div className="py-12 text-center text-slate-500">Loading history...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm">Date & Time</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm">Worker</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm">Method</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm">Reference</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm text-right">Amount Paid</th>
                  {isAdmin && <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm text-center">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-4">
                      <p className="font-semibold text-slate-800">{new Date(payment.payment_date).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400 font-medium">{new Date(payment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-slate-800">{payment.worker_name}</p>
                      <p className="text-xs text-slate-400 font-medium">{payment.worker_code}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
                        {payment.method}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 text-sm">{payment.reference || '-'}</td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-600">₹{Number(payment.amount).toLocaleString('en-IN')}</td>
                    {isAdmin && (
                      <td className="py-4 px-4 text-center">
                        {deletingId === payment.id ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => deleteMutation.mutate(payment.id)}
                              disabled={deleteMutation.isPending}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-xs cursor-pointer"
                            >
                              {deleteMutation.isPending ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded-md cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(payment.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-slate-500">
                      {historySearch ? `No payments matching "${historySearch}"` : 'No payments have been recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Simple Process Payment Modal ───────────────────────── */}
      {isModalOpen && selectedWorker && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Process Payment</h2>
              <p className="text-slate-500 text-sm">
                Settling balance for <span className="font-bold text-slate-800">{selectedWorker.name}</span> ({selectedWorker.human_id})
              </p>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Amount to Pay (₹)</label>
                  <span className="text-xs text-slate-400">Due: ₹{selectedWorker.balance_due.toLocaleString('en-IN')}</span>
                </div>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="number"
                    step="0.01"
                    min="1"
                    value={paymentForm.amount}
                    onChange={e => {
                      setFormError(null);
                      setPaymentForm({ ...paymentForm, amount: e.target.value });
                    }}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-lg font-bold outline-none text-slate-900"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['CASH', 'UPI', 'BANK'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, method })}
                      className={`py-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        paymentForm.method === method 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm font-semibold' 
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {method === 'CASH' && <Banknote className="w-5 h-5" />}
                      {method === 'UPI' && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                          <path d="M11 7h2v6h-2zm0 8h2v2h-2z" />
                        </svg>
                      )}
                      {method === 'BANK' && <CreditCard className="w-5 h-5" />}
                      <span className="text-xs">{method}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(paymentForm.method === 'UPI' || paymentForm.method === 'BANK') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reference / UTR Number</label>
                  <input 
                    type="text" 
                    value={paymentForm.reference}
                    onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-sm text-slate-800"
                    placeholder={paymentForm.method === 'UPI' ? 'e.g. UPI Ref / Txn ID' : 'e.g. Bank Transfer Ref'}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedWorker(null);
                  }}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] cursor-pointer"
                  onClick={() => paymentMutation.mutate()}
                  disabled={!paymentForm.amount || Number(paymentForm.amount) <= 0 || paymentMutation.isPending}
                >
                  {paymentMutation.isPending ? 'Processing...' : 'Confirm Pay'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
