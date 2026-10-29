import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Truck, Package, Search, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Worker {
  id: string;
  name: string;
  worker_id: string;
  status: string;
}

interface Product {
  id: string;
  name: string;
  code?: string;
  rate_per_ton?: string | number;
}

interface WorkEntry {
  id: string;
  worker_name: string;
  worker_human_id: string;
  product_name: string;
  quantity_tons: number;
  rate_applied: number;
  total_amount: number;
}

const getLocalDateString = () => {
  // Get today's date in the browser's local timezone (IST for this system)
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function WorkEntry() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(getLocalDateString());
  const [searchTerm, setSearchTerm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    workerId: '',
    productId: '',
    quantityTons: ''
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['present-workers', date],
    queryFn: async () => {
      const res = await api.get(`/attendance?date=${date}&status=PRESENT&limit=1000`);
      return res.data.data.map((a: any) => ({
        id: a.worker_id,
        name: a.worker_name,
        worker_id: a.worker_code,
        status: 'ACTIVE'
      })) as Worker[];
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/rates/products');
      return res.data.data as Product[];
    }
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['work-entries', date],
    queryFn: async () => {
      const res = await api.get(`/work?date=${date}&limit=1000`);
      return res.data.data as WorkEntry[];
    }
  });

  const selectedProduct = products.find(p => p.id === form.productId);
  const selectedWorker = workers.find(w => w.id === form.workerId);
  const currentRate = selectedProduct?.rate_per_ton ? Number(selectedProduct.rate_per_ton) : 0;
  const estimatedWage = currentRate && form.quantityTons ? (Number(form.quantityTons) * currentRate) : 0;

  const submitMutation = useMutation({
    mutationFn: async () => {
      await api.post('/work', {
        workerId: form.workerId,
        productId: form.productId,
        quantityTons: Number(form.quantityTons),
        workDate: date
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-entries', date] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSuccessMessage('Work entry logged successfully!');
      setValidationError(null);
      setForm(prev => ({ ...prev, quantityTons: '' })); // reset quantity, preserve worker and product for fast batch entry
      setTimeout(() => setSuccessMessage(null), 3500);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to log work entry.';
      setValidationError(msg);
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    if (!form.workerId) {
      setValidationError('Please select a worker from the list.');
      return;
    }
    if (!form.productId) {
      setValidationError('Please select a product.');
      return;
    }
    if (!form.quantityTons || Number(form.quantityTons) <= 0) {
      setValidationError('Please enter a valid quantity in tons (greater than 0).');
      return;
    }

    submitMutation.mutate();
  };

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.worker_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Work Entry</h1>
          <p className="text-slate-500 mt-1">Log daily loading/unloading quantities.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <Calendar className="w-5 h-5 text-indigo-500 ml-2" />
          <input 
            type="date" 
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              // reset selected worker if date changes
              setForm(prev => ({ ...prev, workerId: '' }));
              setValidationError(null);
            }}
            className="outline-none text-slate-700 font-medium bg-transparent mr-2 cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Entry Form */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-5">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
              <Plus className="w-5 h-5 text-indigo-500" />
              Log Work
            </h2>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Success Banner */}
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Worker Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Select Worker <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">
                  {workers.length} present today
                </span>
              </div>

              {/* Search to filter */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
                />
              </div>

              {/* Interactive Worker List Box */}
              {workers.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center space-y-1">
                  <p className="font-semibold">No workers marked present today.</p>
                  <p className="text-amber-700">Mark workers present in Attendance section first, or choose another date.</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-inner">
                  {filteredWorkers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No workers matching "{searchTerm}"
                    </div>
                  ) : (
                    filteredWorkers.map((w) => {
                      const isSelected = form.workerId === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, workerId: w.id }));
                            setValidationError(null);
                          }}
                          className={cn(
                            "w-full text-left px-3.5 py-2.5 flex items-center justify-between text-sm transition-all cursor-pointer group",
                            isSelected
                              ? "bg-indigo-50/90 text-indigo-950 font-semibold border-l-4 border-indigo-600"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={cn(
                              "text-[11px] font-mono px-2 py-0.5 rounded-md shrink-0 font-medium",
                              isSelected 
                                ? "bg-indigo-200/80 text-indigo-800" 
                                : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                            )}>
                              {w.worker_id}
                            </span>
                            <span className="truncate">{w.name}</span>
                          </div>
                          {isSelected ? (
                            <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <span className="text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Selected Worker indicator */}
              {selectedWorker && (
                <div className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
                  <span className="text-indigo-600 font-medium">Selected:</span>
                  <span className="font-bold">{selectedWorker.name} ({selectedWorker.worker_id})</span>
                </div>
              )}
            </div>

            {/* Product Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Select Product <span className="text-rose-500">*</span>
              </label>
              <select 
                value={form.productId}
                onChange={e => {
                  setForm({ ...form, productId: e.target.value });
                  setValidationError(null);
                }}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-800 text-sm font-medium"
                required
              >
                <option value="" disabled>Choose product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ''} {p.rate_per_ton ? `— ₹${Number(p.rate_per_ton).toFixed(2)}/ton` : ''}
                  </option>
                ))}
              </select>
              {selectedProduct?.rate_per_ton && (
                <p className="text-xs text-slate-500 mt-1">
                  Active rate: <span className="font-semibold text-slate-700">₹{Number(selectedProduct.rate_per_ton).toFixed(2)} / ton</span>
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Quantity (Tons) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.quantityTons}
                  onChange={e => {
                    setForm({ ...form, quantityTons: e.target.value });
                    setValidationError(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-lg font-bold text-slate-800"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Wage Calculation Preview */}
            {estimatedWage > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-medium">Estimated Wage:</span>
                <span className="text-emerald-800 font-bold text-sm">₹{estimatedWage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            <Button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-2 py-6 text-base shadow-lg shadow-indigo-200 cursor-pointer"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? 'Logging...' : 'Log Entry'}
            </Button>
          </form>
        </div>

        {/* Entries List */}
        <div className="lg:col-span-2">
          <div className="glass p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[500px]">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-500" />
              Today's Logs
            </h2>

            {isLoading ? (
              <div className="py-12 text-center text-slate-500">Loading entries...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 pt-2 px-4 font-semibold text-slate-600 text-sm">Worker</th>
                      <th className="pb-3 pt-2 px-4 font-semibold text-slate-600 text-sm">Product</th>
                      <th className="pb-3 pt-2 px-4 font-semibold text-slate-600 text-sm text-right">Qty (Tons)</th>
                      <th className="pb-3 pt-2 px-4 font-semibold text-slate-600 text-sm text-right">Rate</th>
                      <th className="pb-3 pt-2 px-4 font-semibold text-slate-600 text-sm text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <p className="font-semibold text-slate-800">{entry.worker_name}</p>
                          <p className="text-xs text-slate-400 font-medium">{entry.worker_human_id}</p>
                        </td>
                        <td className="py-4 px-4 text-slate-600 font-medium">{entry.product_name}</td>
                        <td className="py-4 px-4 text-right font-bold text-slate-800">{Number(entry.quantity_tons).toFixed(2)}</td>
                        <td className="py-4 px-4 text-right text-slate-500">₹{Number(entry.rate_applied).toFixed(2)}</td>
                        <td className="py-4 px-4 text-right font-bold text-emerald-600">₹{Number(entry.total_amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {entries.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-slate-400">
                          <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p>No work logged for this date yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
