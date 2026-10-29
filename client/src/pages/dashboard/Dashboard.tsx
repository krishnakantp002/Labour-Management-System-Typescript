import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { 
  Users, 
  Truck, 
  IndianRupee, 
  Wallet,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStats {
  attendance: { present: number; absent: number };
  work: { totalTons: number; totalAmount: number };
  pendingPayments: number;
  recentWork: {
    id: string;
    quantity_tons: string;
    amount: string;
    created_at: string;
    product_name: string;
    worker_name: string;
    worker_code: string;
  }[];
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data.data as DashboardStats;
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading real-time stats...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      title: "Workers Present",
      value: data.attendance.present.toString(),
      subtitle: `${data.attendance.absent} absent today`,
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100"
    },
    {
      title: "Total Tons Loaded",
      value: `${data.work.totalTons.toFixed(2)} t`,
      subtitle: "Logged today",
      icon: Truck,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100"
    },
    {
      title: "Total Wages Today",
      value: `₹${data.work.totalAmount.toLocaleString('en-IN')}`,
      subtitle: "Earned across all workers",
      icon: IndianRupee,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-100"
    },
    {
      title: "Pending Payments",
      value: `₹${data.pendingPayments.toLocaleString('en-IN')}`,
      subtitle: "Global outstanding balance",
      icon: Wallet,
      color: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-100"
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1>
        <p className="text-slate-500 mt-1">Live metrics for today's operations.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {statCards.map(stat => (
          <div key={stat.title} className="glass p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-500 tracking-wide">{stat.title}</span>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</span>
                </div>
              </div>
              <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="glass p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          Recent Work Entries
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-3 pt-2 px-4 font-semibold text-slate-500 text-sm">Time</th>
                <th className="pb-3 pt-2 px-4 font-semibold text-slate-500 text-sm">Worker</th>
                <th className="pb-3 pt-2 px-4 font-semibold text-slate-500 text-sm">Product</th>
                <th className="pb-3 pt-2 px-4 font-semibold text-slate-500 text-sm text-right">Quantity</th>
                <th className="pb-3 pt-2 px-4 font-semibold text-slate-500 text-sm text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recentWork.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 text-sm text-slate-500 font-medium">
                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-semibold text-slate-800">{entry.worker_name}</p>
                    <p className="text-xs text-slate-400 font-medium">{entry.worker_code}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {entry.product_name}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-slate-700">
                    {Number(entry.quantity_tons).toFixed(2)} t
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-indigo-600">
                    ₹{Number(entry.amount).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
              {data.recentWork.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    No work logged recently.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
