import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Truck, Package, Search } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  worker_id: string;
  status: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
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
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export default function WorkEntry() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(getLocalDateString());
  const [searchTerm, setSearchTerm] = useState('');
  
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
      setForm({ ...form, quantityTons: '' }); // reset only quantity
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.workerId || !form.productId || !form.quantityTons) return;
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
            onChange={(e) => setDate(e.target.value)}
            className="outline-none text-slate-700 font-medium bg-transparent mr-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Entry Form */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-5">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              Log Work
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Worker</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search to filter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select 
                value={form.workerId}
                onChange={e => setForm({...form, workerId: e.target.value})}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                required
                size={5}
              >
                {filteredWorkers.map(w => (
                  <option key={w.id} value={w.id} className="p-2 cursor-pointer border-b border-slate-50 hover:bg-indigo-50">
                    {w.worker_id} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Product</label>
              <select 
                value={form.productId}
                onChange={e => setForm({...form, productId: e.target.value})}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
                required
              >
                <option value="" disabled>Choose product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity (Tons)</label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.quantityTons}
                  onChange={e => setForm({...form, quantityTons: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-lg font-bold"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-2 py-6 text-base shadow-lg shadow-indigo-200"
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
