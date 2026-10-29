import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { History, Search } from 'lucide-react';

interface ActivityLog {
  id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  method: string;
  route: string;
  status_code: number;
  ip: string | null;
  details: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  WORKER: 'bg-blue-100 text-blue-700',
  PRODUCT: 'bg-amber-100 text-amber-700',
  RATE: 'bg-orange-100 text-orange-700',
  WORK_ENTRY: 'bg-indigo-100 text-indigo-700',
  ATTENDANCE: 'bg-teal-100 text-teal-700',
  PAYMENT: 'bg-emerald-100 text-emerald-700',
  USER: 'bg-purple-100 text-purple-700',
  AUTH: 'bg-slate-200 text-slate-700',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  role: 'Role',
  isActive: 'Active',
  workerName: 'Worker',
  code: 'Code',
  phone: 'Phone',
  photoUrl: 'Photo',
  productName: 'Product',
  product: 'Product',
  ratePerTon: 'Rate (₹/ton)',
  rate: 'Rate',
  quantityTons: 'Quantity (tons)',
  workDate: 'Work Date',
  entryDate: 'Date',
  paymentDate: 'Payment Date',
  amount: 'Amount (₹)',
  method: 'Method',
  reference: 'Reference',
  date: 'Date',
  status: 'Status',
  checkIn: 'Check-In',
  checkOut: 'Check-Out',
  remarks: 'Remarks',
  entries: 'Entries',
  workers: 'Workers',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_FRAG_RE = /^[0-9a-f]{6,}…?$/i; // shortened hex id, e.g. "8f3a91b2…"

function formatValue(key: string, value: unknown): { label: string; text: string; isId: boolean } {
  if (typeof value !== 'string') {
    if (typeof value === 'boolean') return { label: FIELD_LABELS[key] || key, text: value ? 'Yes' : 'No', isId: false };
    if (value === null || value === undefined || value === '') return { label: '', text: '', isId: false };
    if (typeof value === 'object') return { label: '', text: '', isId: false };
    return { label: FIELD_LABELS[key] || key, text: String(value), isId: false };
  }

  // Never reflect raw ids — full or shortened uuids are skipped entirely
  if (UUID_RE.test(value) || UUID_FRAG_RE.test(value)) {
    return { label: '', text: '', isId: false };
  }

  if (value === '[redacted]') {
    return { label: FIELD_LABELS[key] || key, text: value, isId: true };
  }

  // Old-format bulk summaries like "[3 records]"
  const bulkMatch = value.match(/^\[(\d+) records\]$/);
  if (bulkMatch) {
    return { label: FIELD_LABELS[key] || key, text: `${bulkMatch[1]} entries`, isId: false };
  }

  return { label: FIELD_LABELS[key] || key, text: value, isId: false };
}

function parseDetails(details: string | null): { label: string; text: string; isId: boolean }[] {
  if (!details) return [];
  try {
    const obj = JSON.parse(details);
    return Object.entries(obj)
      .map(([key, value]) => formatValue(key, value))
      .filter((item) => item.label && item.text);
  } catch {
    return [{ label: 'Raw', text: details.slice(0, 120), isId: false }];
  }
}

export default function Logs() {
  const [search, setSearch] = useState('');
  const [limit] = useState(200);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const res = await api.get(`/logs?limit=${limit}`);
      return res.data.data as ActivityLog[];
    },
    refetchInterval: 15000, // keep the log fresh
  });

  const filtered = search
    ? logs.filter((log) =>
        `${log.action} ${log.actor_name} ${log.route} ${log.details || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Audit Log</h1>
          <p className="text-slate-500 mt-1">Every alteration in the system, recorded automatically — who did it and when.</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions, users..."
            className="pl-10 pr-4 py-2.5 w-72 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
          />
        </div>
      </div>

      <div className="glass p-6 rounded-2xl border border-slate-100 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading audit log...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Person</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((log) => {
                  const fields = parseDetails(log.details);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors align-top">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-sm font-medium text-slate-800">
                          {new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-sm font-semibold text-slate-800">{log.actor_name}</p>
                        <p className="text-xs text-slate-400">{log.actor_role}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ACTION_COLORS[log.entity_type] || 'bg-slate-100 text-slate-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[28rem]">
                        {fields.length > 0 ? (
                          <div className="space-y-1">
                            {fields.map((field, i) => (
                              <p key={i} className="text-xs text-slate-600 leading-relaxed">
                                <span className="text-slate-400 font-medium">{field.label}:</span>{' '}
                                <span
                                  className={
                                    field.isId || field.label === 'Remarks' || field.label === 'Reference'
                                      ? 'font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded'
                                      : 'font-semibold text-slate-700'
                                  }
                                >
                                  {field.text}
                                </span>
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">—</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <History className="w-10 h-10 text-slate-300" />
                {search ? 'No entries match your search.' : 'No activity recorded yet. Actions will appear here automatically.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
