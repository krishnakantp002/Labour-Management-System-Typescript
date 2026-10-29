import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import {
  ArrowLeft,
  Phone,
  Calendar,
  TrendingUp,
  Package,
  Truck,
  Clock,
  Filter,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */

interface WorkerInfo {
  id: string;
  worker_id: string;
  name: string;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  remarks: string | null;
  created_at: string;
}

interface WorkEntryItem {
  id: string;
  product_name: string;
  quantity_tons: string;
  rate_used: string;
  amount: string;
  work_date: string;
}

interface WorkerEarnings {
  workerId: string;
  totalEntries: number;
  totalTons: number;
  totalEarnings: number;
  workingDays: number;
  entries: WorkEntryItem[];
}

/* ─── Helpers ────────────────────────────────────────────── */

function groupByDate(entries: WorkEntryItem[]): Map<string, WorkEntryItem[]> {
  const map = new Map<string, WorkEntryItem[]>();
  for (const entry of entries) {
    const date = entry.work_date.split('T')[0];
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(entry);
  }
  return map;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDefaultDates() {
  const end = new Date();
  end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

/* ─── Quick-filter presets ───────────────────────────────── */

const PRESETS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: 'All Time', days: 365 * 5 },
] as const;

/* ─── Component ──────────────────────────────────────────── */

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState(getDefaultDates);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  /* toggle a date-group open / closed */
  const toggleDate = (date: string) =>
    setExpandedDates((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });

  /* ── Queries ─────────────────────────────────────────── */

  const { data: worker, isLoading: workerLoading } = useQuery({
    queryKey: ['worker', id],
    queryFn: async () => {
      const res = await api.get(`/workers/${id}`);
      return res.data.data as WorkerInfo;
    },
  });

  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['worker-earnings', id, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const res = await api.get(`/work/worker/${id}`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      return res.data.data as WorkerEarnings;
    },
  });

  const groupedEntries = useMemo(() => {
    if (!earnings?.entries) return new Map<string, WorkEntryItem[]>();
    return groupByDate(earnings.entries);
  }, [earnings]);

  /* auto-expand first 3 dates on initial load */
  useMemo(() => {
    if (expandedDates.size === 0 && groupedEntries.size > 0) {
      const first3 = Array.from(groupedEntries.keys()).slice(0, 3);
      setExpandedDates(new Set(first3));
    }
  }, [groupedEntries]);

  const isLoading = workerLoading || earningsLoading;

  /* ── Skeleton ────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-in">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/workers')}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={() => navigate('/workers')}
          className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 mt-1"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>

        <div className="flex-1 min-w-0">
          {/* Name + badge */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {worker?.name}
                </h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    worker?.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {worker?.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-slate-500 text-sm font-medium">
                  {worker?.worker_id}
                </span>
                {worker?.phone && (
                  <span className="text-slate-400 text-sm flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {worker.phone}
                  </span>
                )}
                {worker?.remarks && (
                  <span className="text-slate-400 text-sm italic truncate max-w-xs">
                    "{worker.remarks}"
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Earnings',
            value: `₹${(earnings?.totalEarnings ?? 0).toLocaleString('en-IN')}`,
            icon: TrendingUp,
            color: 'indigo',
          },
          {
            label: 'Total Tons Loaded',
            value: (earnings?.totalTons ?? 0).toFixed(2),
            icon: Truck,
            color: 'emerald',
          },
          {
            label: 'Working Days',
            value: String(earnings?.workingDays ?? 0),
            icon: Clock,
            color: 'amber',
          },
          {
            label: 'Total Entries',
            value: String(earnings?.totalEntries ?? 0),
            icon: Package,
            color: 'purple',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="glass p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center`}
              >
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <span className="text-sm font-medium text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* ─── Date-Range Filter ───────────────────────────── */}
      <div className="glass p-4 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-semibold">Date Range:</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange((p) => ({ ...p, startDate: e.target.value }))
                }
                className="outline-none text-sm text-slate-700 font-medium bg-transparent"
              />
            </label>

            <span className="text-slate-400 text-sm">to</span>

            <label className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange((p) => ({ ...p, endDate: e.target.value }))
                }
                className="outline-none text-sm text-slate-700 font-medium bg-transparent"
              />
            </label>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 ml-auto flex-wrap">
            {PRESETS.map(({ label, days }) => (
              <button
                key={label}
                onClick={() => {
                  const end = new Date();
                  end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
                  const start = new Date(end);
                  start.setDate(start.getDate() - days);
                  setDateRange({
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0],
                  });
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Work Logs (grouped by date) ─────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Truck className="w-5 h-5 text-indigo-500" />
          Loading Work Logs
        </h2>

        {groupedEntries.size === 0 ? (
          <div className="glass p-16 rounded-2xl border border-slate-100 shadow-sm text-center">
            <Truck className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <p className="text-lg font-semibold text-slate-400">
              No work logs found
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Try adjusting the date range to see records.
            </p>
          </div>
        ) : (
          Array.from(groupedEntries.entries()).map(([date, entries]) => {
            const dayTotalTons = entries.reduce(
              (sum, e) => sum + parseFloat(e.quantity_tons),
              0,
            );
            const dayTotalAmount = entries.reduce(
              (sum, e) => sum + parseFloat(e.amount),
              0,
            );
            const isExpanded = expandedDates.has(date);

            return (
              <div
                key={date}
                className="glass rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Date header — clickable */}
                <button
                  onClick={() => toggleDate(date)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between cursor-pointer hover:from-indigo-50/40 hover:to-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800">
                        {formatDate(date)}
                      </p>
                      <p className="text-xs text-slate-400">{date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400 font-medium">
                        Entries
                      </p>
                      <p className="text-sm font-bold text-slate-600">
                        {entries.length}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-medium">
                        Total Tons
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {dayTotalTons.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-medium">
                        Earned
                      </p>
                      <p className="text-sm font-bold text-emerald-600">
                        ₹{dayTotalAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded entries table */}
                {isExpanded && (
                  <div className="animate-in">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="py-2.5 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="py-2.5 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                            Quantity (Tons)
                          </th>
                          <th className="py-2.5 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                            Rate (₹/ton)
                          </th>
                          <th className="py-2.5 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                            Amount (₹)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-b border-slate-50 last:border-0 hover:bg-indigo-50/30 transition-colors"
                          >
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full" />
                                <span className="font-medium text-slate-700">
                                  {entry.product_name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-right font-bold text-slate-800">
                              {parseFloat(entry.quantity_tons).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-6 text-right text-slate-500">
                              ₹{parseFloat(entry.rate_used).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-6 text-right font-bold text-emerald-600">
                              ₹{parseFloat(entry.amount).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                        {/* Day total row */}
                        <tr className="bg-slate-50/80 border-t border-slate-200">
                          <td className="py-3 px-6 font-semibold text-slate-600 text-sm">
                            Day Total
                          </td>
                          <td className="py-3 px-6 text-right font-bold text-slate-800 text-sm">
                            {dayTotalTons.toFixed(2)}
                          </td>
                          <td className="py-3 px-6" />
                          <td className="py-3 px-6 text-right font-bold text-emerald-700 text-sm">
                            ₹{dayTotalAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
