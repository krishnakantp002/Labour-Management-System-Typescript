import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { FileText, Calendar as CalendarIcon, FileSpreadsheet } from 'lucide-react';

interface WorkerSummary {
  id: string;
  worker_id: string;
  name: string;
  days_present: number;
  total_tons: number;
  total_earned: number;
  total_paid: number;
  pending_balance: number;
}

export default function Reports() {
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [endDate, setEndDate] = useState(() => getLocalDateString());

  const { data: reportData = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['report-worker-summary', startDate, endDate],
    queryFn: async () => {
      const res = await api.get(`/reports/worker-summary?startDate=${startDate}&endDate=${endDate}`);
      return res.data.data as WorkerSummary[];
    },
    enabled: !!startDate && !!endDate,
  });

  const handleExportCSV = () => {
    if (!reportData.length) return;
    
    const headers = ['Worker ID', 'Name', 'Days Present', 'Total Tons', 'Total Earned', 'Total Paid', 'Pending Balance'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => [
        row.worker_id,
        `"${row.name}"`,
        row.days_present,
        row.total_tons,
        row.total_earned,
        row.total_paid,
        row.pending_balance
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Worker_Summary_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Generate historical reports and export data.</p>
        </div>
        <Button 
          onClick={handleExportCSV} 
          disabled={!reportData.length || isFetching}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="glass p-6 rounded-3xl border border-slate-100 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-500" />
          Report Parameters
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
            />
          </div>
          <Button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] py-2.5 h-[46px]"
          >
            {isFetching ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>

      <div className="glass p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[400px]">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          Worker Summary Report
        </h2>

        {isLoading || isFetching ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p>Crunching the numbers...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="pb-3 pt-3 px-4 font-semibold text-slate-600 text-sm rounded-tl-xl">Worker</th>
                  <th className="pb-3 pt-3 px-4 font-semibold text-slate-600 text-sm text-right">Days Present</th>
                  <th className="pb-3 pt-3 px-4 font-semibold text-slate-600 text-sm text-right">Total Tons</th>
                  <th className="pb-3 pt-3 px-4 font-semibold text-slate-600 text-sm text-right">Total Earned</th>
                  <th className="pb-3 pt-3 px-4 font-semibold text-slate-600 text-sm text-right">Total Paid</th>
                  <th className="pb-3 pt-3 px-4 font-semibold text-slate-600 text-sm text-right rounded-tr-xl">Pending Balance</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-semibold text-slate-800">{row.name}</p>
                      <p className="text-xs text-slate-400 font-medium">{row.worker_id}</p>
                    </td>
                    <td className="py-4 px-4 text-right text-slate-700 font-medium">{row.days_present}</td>
                    <td className="py-4 px-4 text-right text-slate-700 font-medium">{Number(row.total_tons).toFixed(2)} t</td>
                    <td className="py-4 px-4 text-right text-indigo-600 font-medium">₹{Number(row.total_earned).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-4 text-right text-emerald-600 font-medium">₹{Number(row.total_paid).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-4 text-right font-bold text-rose-600">₹{Number(row.pending_balance).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No data found for the selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
