import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { IndianRupee, CreditCard, Banknote, History, Wallet } from 'lucide-react';

interface PendingPayment {
  worker_id: string; // The UUID
  human_id: string; // The readable ID (e.g., W-001)
  name: string;
  total_earned: number;
  total_paid: number;
  balance_due: number;
}

interface PaymentHistory {
  id: string;
  worker_name: string;
  worker_code: string;
  amount: string;
  method: string;
  reference: string;
  payment_date: string;
  created_at: string;
}

export default function Payments() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<PendingPayment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'CASH',
    reference: '',
    remarks: ''
  });

  const { data: pendingBalances = [], isLoading } = useQuery({
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

  const { data: history = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ['payments-history'],
    queryFn: async () => {
      const res = await api.get('/payments?limit=50');
      return res.data.data as PaymentHistory[];
    }
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorker) return;
      await api.post('/payments', {
        workerId: selectedWorker.worker_id,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        remarks: paymentForm.remarks || undefined,
        paymentDate: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-pending'] });
      queryClient.invalidateQueries({ queryKey: ['payments-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsModalOpen(false);
      setSelectedWorker(null);
    }
  });

  const handleOpenPay = (worker: PendingPayment) => {
    setSelectedWorker(worker);
    setPaymentForm({
      amount: Number(worker.balance_due), // Pre-fill with full balance
      method: 'CASH',
      reference: '',
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const totalOwed = pendingBalances.reduce((sum, w) => sum + Number(w.balance_due), 0);

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
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

      <div className="glass p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" />
          Pending Settlements
        </h2>

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
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingBalances.map((worker) => {
                  const balance = Number(worker.balance_due);
                  if (balance <= 0) return null; // Only show positive balances

                  return (
                    <tr key={worker.worker_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-800">{worker.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{worker.human_id}</p>
                      </td>
                      <td className="py-4 px-4 text-right text-slate-600 font-medium">₹{Number(worker.total_earned).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right text-slate-600 font-medium">₹{Number(worker.total_paid).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right font-bold text-rose-600">₹{balance.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right">
                        <Button 
                          onClick={() => handleOpenPay(worker)}
                          className="bg-indigo-600 hover:bg-indigo-700 shadow-sm text-white"
                          size="sm"
                        >
                          Process Payment
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {pendingBalances.filter(w => Number(w.balance_due) > 0).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      All settled up! No pending balances. 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="glass p-6 rounded-2xl border border-slate-100 shadow-sm mt-8">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" />
          Recent Payments
        </h2>

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
                </tr>
              </thead>
              <tbody>
                {history.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-4">
                      <p className="font-semibold text-slate-800">{new Date(payment.payment_date).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400 font-medium">{new Date(payment.created_at).toLocaleTimeString()}</p>
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
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No payments have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {isModalOpen && selectedWorker && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Process Payment</h2>
            <p className="text-slate-500 text-sm mb-6">Settling balance for <span className="font-bold text-slate-700">{selectedWorker.name}</span></p>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount to Pay (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="number" 
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-lg font-bold outline-none"
                    max={selectedWorker.balance_due}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {['CASH', 'UPI', 'BANK'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentForm({...paymentForm, method})}
                      className={`py-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        paymentForm.method === method 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' 
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {method === 'CASH' && <Banknote className="w-5 h-5" />}
                      {method === 'UPI' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M11 7h2v6h-2zm0 8h2v2h-2z"/></svg>}
                      {method === 'BANK' && <CreditCard className="w-5 h-5" />}
                      <span className="text-xs font-semibold">{method}</span>
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
                    onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                    placeholder="e.g. 1234567890"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                  onClick={() => paymentMutation.mutate()}
                  disabled={paymentForm.amount <= 0 || paymentMutation.isPending}
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
