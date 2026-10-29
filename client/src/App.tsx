import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import Workers from './pages/workers/Workers';
import WorkerDetail from './pages/workers/WorkerDetail';
import Products from './pages/products/Products';
import Attendance from './pages/attendance/Attendance';
import WorkEntry from './pages/work/WorkEntry';
import Payments from './pages/payments/Payments';
import Reports from './pages/reports/Reports';
import Users from './pages/users/Users';
import Logs from './pages/logs/Logs';
import AppLayout from './components/layout/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workers" element={<Workers />} />
            <Route path="workers/:id" element={<WorkerDetail />} />
            <Route path="products" element={<Products />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="work" element={<WorkEntry />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<Users />} />
            <Route path="logs" element={<Logs />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
