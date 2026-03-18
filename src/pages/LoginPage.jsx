import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = {
  admin:   '/',
  teacher: '/teacher-dashboard',
  student: '/student-dashboard',
  parent:  '/parent-dashboard',
};

const DEMO_ACCOUNTS = [
  { role: 'Admin',   username: 'admin',   password: 'admin123'   },
  { role: 'Teacher', username: 'teacher', password: 'teacher123' },
  { role: 'Student', username: 'student', password: 'student123' },
  { role: 'Parent',  username: 'parent',  password: 'parent123'  },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  const [form,    setForm]    = useState({ username: '', password: '' });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const user = await signIn(form.username.trim(), form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(from || ROLE_HOME[user.role] || '/', { replace: true });
    } catch (err) {
      toast.error(err.displayMessage || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (username, password) => {
    setForm({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">SchoolMS</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-white/10 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* First-time setup link */}
          <p className="text-center text-xs text-slate-500 mt-5">
            New installation?{' '}
            <Link to="/setup" className="text-indigo-400 hover:text-indigo-300 font-medium">
              First time setup
            </Link>
          </p>

          {/* Demo accounts */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 text-center">
              Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(({ role, username, password }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemo(username, password)}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
                >
                  <p className="text-[11px] font-bold text-indigo-400">{role}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{username}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
