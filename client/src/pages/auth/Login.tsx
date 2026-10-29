import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/login', { email, password });
      return data;
    },
    onSuccess: (res) => {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  });

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0B0F19] relative overflow-hidden">
      {/* Background Orbs for Premium Aesthetic */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[120px] mix-blend-screen animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="glass-dark w-full max-w-md p-10 rounded-[2rem] animate-in relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(99,102,241,0.4)]">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TrackLabours</h1>
          <p className="text-slate-400 mt-2 text-sm">Sign in to manage your workforce</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm mb-6 text-center backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-5 py-4 rounded-xl border border-slate-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-slate-800/50 text-white placeholder-slate-500 backdrop-blur-sm"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-5 py-4 rounded-xl border border-slate-700/50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-slate-800/50 text-white placeholder-slate-500 backdrop-blur-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full py-6 text-[15px] font-semibold rounded-xl bg-white text-indigo-900 hover:bg-slate-100 hover:scale-[1.02] transition-all duration-200"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Authenticating...' : 'Sign In'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
