import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Plus, Users as UsersIcon, ShieldCheck, ShieldOff } from 'lucide-react';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_OPTIONS = ['MANAGER', 'EMPLOYEE', 'ADMIN'];

export default function Users() {
  const queryClient = useQueryClient();
  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')?.id as string | undefined;
    } catch {
      return undefined;
    }
  })();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'MANAGER' });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/auth/users');
      return res.data.data as AppUser[];
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/register', form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setForm({ name: '', email: '', password: '', role: 'MANAGER' });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to create user');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/auth/users/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update status');
    }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Users</h1>
          <p className="text-slate-500 mt-1">Create accounts for counter staff and control who has access.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="glass p-6 rounded-2xl border border-slate-100 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{user.name}{isSelf && ' (You)'}</p>
                            <p className="text-xs text-slate-400">Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{user.email}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-700'
                            : user.role === 'MANAGER'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {user.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: user.id,
                              isActive: !user.is_active
                            })
                          }
                          disabled={isSelf || toggleStatusMutation.isPending}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            user.is_active
                              ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                          title={isSelf ? "You can't deactivate your own account" : undefined}
                        >
                          {user.is_active ? (
                            <><ShieldOff className="w-3.5 h-3.5" /> Disable</>
                          ) : (
                            <><ShieldCheck className="w-3.5 h-3.5" /> Enable</>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <UsersIcon className="w-10 h-10 text-slate-300" />
                No users found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Add New User</h2>
            <p className="text-sm text-slate-500 mb-5">Share these credentials with the counter person after creating.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Ramesh Kumar"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ramesh@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => createUserMutation.mutate()}
                  disabled={!form.name || !form.email || form.password.length < 6 || createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
