import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Users, Clock, DollarSign, FileText, Truck, Tag, ShieldCheck, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menu = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Workers', icon: Users, path: '/workers' },
    { name: 'Products', icon: Tag, path: '/products' },
    { name: 'Attendance', icon: Clock, path: '/attendance' },
    { name: 'Work Entry', icon: Truck, path: '/work' },
    { name: 'Payments', icon: DollarSign, path: '/payments' },
    { name: 'Reports', icon: FileText, path: '/reports' },
    // User management is admin-only
    ...(user?.role === 'ADMIN' ? [{ name: 'Users', icon: ShieldCheck, path: '/users' }] : []),
    // Audit log is admin-only
    ...(user?.role === 'ADMIN' ? [{ name: 'Audit Log', icon: History, path: '/logs' }] : []),
  ];

  return (
    <div className="flex h-screen bg-slate-50/50">
      {/* Sidebar */}
      <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="font-bold text-lg text-slate-800 tracking-tight">TrackLabours</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menu.map(item => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/');
            return (
              <button 
                key={item.name}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm group",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-indigo-100" : "text-slate-400 group-hover:text-indigo-600"
                )} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-xl p-4 mb-4 border border-slate-100/80 shadow-inner">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Admin User'}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{user?.role || 'Administrator'}</p>
          </div>
          <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
        <Outlet />
      </main>
    </div>
  );
}
