import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Calendar, Save, CheckCircle2, XCircle } from 'lucide-react';

interface Worker {
  id: string;
  worker_id: string;
  name: string;
  status: string;
}

interface AttendanceRecord {
  id: string;
  worker_id: string;
  status: 'PRESENT' | 'ABSENT';
}

const getLocalDateString = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export default function Attendance() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(getLocalDateString());
  const [localAttendance, setLocalAttendance] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const res = await api.get('/workers');
      // Only show active workers for attendance
      return (res.data.data as Worker[]).filter(w => w.status === 'ACTIVE');
    }
  });

  const { data: attendanceData = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance', date],
    queryFn: async () => {
      const res = await api.get(`/attendance?date=${date}&limit=1000`);
      const records = res.data.data as AttendanceRecord[];
      
      // Initialize local state with DB state
      const initialMap: Record<string, 'PRESENT' | 'ABSENT'> = {};
      records.forEach(r => {
        initialMap[r.worker_id] = r.status;
      });
      setLocalAttendance(initialMap);
      return records;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.keys(localAttendance).map(workerId => ({
        workerId,
        status: localAttendance[workerId]
      }));
      if (entries.length === 0) return;
      await api.post('/attendance/bulk', { date, entries });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', date] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const handleMark = (workerId: string, status: 'PRESENT' | 'ABSENT') => {
    setLocalAttendance(prev => ({ ...prev, [workerId]: status }));
  };

  const handleMarkAll = (status: 'PRESENT' | 'ABSENT') => {
    const newMap = { ...localAttendance };
    workers.forEach(w => {
      newMap[w.id] = status;
    });
    setLocalAttendance(newMap);
  };

  const isDirty = useMemo(() => {
    // Check if local state differs from DB or has unsaved entries
    for (const w of workers) {
      const dbStatus = attendanceData.find(a => a.worker_id === w.id)?.status;
      const localStatus = localAttendance[w.id];
      if (localStatus && localStatus !== dbStatus) return true;
    }
    return false;
  }, [localAttendance, attendanceData, workers]);

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Daily Attendance</h1>
          <p className="text-slate-500 mt-1">Mark present or absent for active workers.</p>
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

      <div className="glass p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleMarkAll('PRESENT')} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              Mark All Present
            </Button>
            <Button variant="outline" onClick={() => handleMarkAll('ABSENT')} className="text-rose-600 border-rose-200 hover:bg-rose-50">
              Mark All Absent
            </Button>
          </div>
          
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 text-white min-w-[140px]"
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {isLoadingAttendance ? (
          <div className="py-12 text-center text-slate-500">Loading attendance data...</div>
        ) : (
          <div className="grid gap-3">
            {workers.map((worker) => {
              const currentStatus = localAttendance[worker.id];
              return (
                <div key={worker.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-indigo-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{worker.name}</h3>
                      <p className="text-xs text-slate-400 font-medium">{worker.worker_id}</p>
                    </div>
                  </div>
                  
                  <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                    <button
                      onClick={() => handleMark(worker.id, 'PRESENT')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        currentStatus === 'PRESENT' 
                          ? 'bg-emerald-500 text-white shadow-sm' 
                          : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Present
                    </button>
                    <button
                      onClick={() => handleMark(worker.id, 'ABSENT')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        currentStatus === 'ABSENT' 
                          ? 'bg-rose-500 text-white shadow-sm' 
                          : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      <XCircle className="w-4 h-4" /> Absent
                    </button>
                  </div>
                </div>
              );
            })}
            
            {workers.length === 0 && (
              <div className="py-12 text-center text-slate-500">
                No active workers found. Add some workers first.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
