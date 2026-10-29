import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit2 } from 'lucide-react';

interface Worker {
  id: string;
  worker_id: string;
  name: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  today_attendance?: string;
  balance?: number;
}

export default function Workers() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newWorker, setNewWorker] = useState({ name: '', phone: '' });
  const [editWorker, setEditWorker] = useState<Worker | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const res = await api.get('/workers');
      return res.data.data as Worker[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (workerData: { name: string; phone: string }) => {
      await api.post('/workers', workerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setIsAddModalOpen(false);
      setNewWorker({ name: '', phone: '' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (workerData: Partial<Worker> & { id: string }) => {
      const { id, ...data } = workerData;
      await api.put(`/workers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setIsEditModalOpen(false);
      setEditWorker(null);
    }
  });

  const filteredWorkers = data?.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.worker_id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Workers Directory</h1>
          <p className="text-slate-500 mt-1">Manage all your daily wage employees here.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Worker
        </Button>
      </div>

      <div className="glass p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search workers by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          />
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading workers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm">Worker ID</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm">Name</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm">Phone</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm">Status</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm">Today's Attendance</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm text-right">Balance (₹)</th>
                  <th className="pb-3 pt-4 px-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((worker) => (
                  <tr key={worker.id} onClick={() => navigate(`/workers/${worker.id}`)} className="border-b border-slate-50 hover:bg-indigo-50/40 transition-colors group cursor-pointer">
                    <td className="py-4 px-4 font-medium text-slate-900">{worker.worker_id}</td>
                    <td className="py-4 px-4 text-slate-700">{worker.name}</td>
                    <td className="py-4 px-4 text-slate-500">{worker.phone || 'N/A'}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        worker.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {worker.today_attendance ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          worker.today_attendance === 'PRESENT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                          {worker.today_attendance}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">Not Marked</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-bold ${Number(worker.balance || 0) > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                        ₹{Number(worker.balance || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={() => {
                          setEditWorker(worker);
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredWorkers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No workers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Worker Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Add New Worker</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={newWorker.name}
                  onChange={e => setNewWorker({...newWorker, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Rahul Kumar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
                <input 
                  type="text" 
                  value={newWorker.phone}
                  onChange={e => setNewWorker({...newWorker, phone: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => createMutation.mutate(newWorker)}
                  disabled={!newWorker.name || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Worker'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Worker Modal */}
      {isEditModalOpen && editWorker && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Edit Worker</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={editWorker.name}
                  onChange={e => setEditWorker({...editWorker, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={editWorker.phone || ''}
                  onChange={e => setEditWorker({...editWorker, phone: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editWorker.status}
                  onChange={e => setEditWorker({...editWorker, status: e.target.value as 'ACTIVE' | 'INACTIVE'})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => updateMutation.mutate(editWorker)}
                  disabled={!editWorker.name || updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Update Worker'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
