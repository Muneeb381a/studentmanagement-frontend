import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, TrendingDown, Users, RefreshCw, ChevronDown,
  Search, BookOpen, ClipboardCheck, NotebookPen, Banknote, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { getRiskScores, getRiskSummary, recalculateRisk } from '../api/risk';

const BAND_CONFIG = {
  high:   { label: 'High Risk',   bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-700 dark:text-red-400',     dot: 'bg-red-500',     bar: 'bg-red-500'   },
  medium: { label: 'Medium Risk', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500',   bar: 'bg-amber-500' },
  low:    { label: 'Low Risk',    bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
};

const SIGNALS = [
  { key: 'attendance_score', label: 'Attendance', icon: ClipboardCheck, color: '#6366f1' },
  { key: 'exam_score',       label: 'Exams',      icon: BookOpen,       color: '#f59e0b' },
  { key: 'homework_score',   label: 'Homework',   icon: NotebookPen,    color: '#10b981' },
  { key: 'fee_score',        label: 'Fees',       icon: Banknote,       color: '#ef4444' },
];

function ScoreBar({ value, color }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, value || 0)}%`, backgroundColor: color }} />
    </div>
  );
}

export default function AtRiskPage() {
  const navigate = useNavigate();
  const [scores,   setScores]   = useState([]);
  const [summary,  setSummary]  = useState({});
  const [loading,  setLoading]  = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [band,     setBand]     = useState('');
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const PER_PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [scoresRes, summaryRes] = await Promise.all([
        getRiskScores({ band: band || undefined, limit: 200 }),
        getRiskSummary(),
      ]);
      setScores(scoresRes.data?.data ?? scoresRes.data ?? []);
      setSummary(summaryRes.data?.data ?? summaryRes.data ?? {});
    } catch {
      toast.error('Failed to load risk data');
    } finally {
      setLoading(false);
    }
  }, [band]);

  useEffect(() => { load(); }, [load]);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      await recalculateRisk();
      toast.success('Risk scores recalculated');
      load();
    } catch {
      toast.error('Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  }

  const filtered = scores.filter(s =>
    !search || s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  if (loading) return <Layout><PageLoader /></Layout>;

  const total = (summary.high || 0) + (summary.medium || 0) + (summary.low || 0);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={24} />
              At-Risk Students
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              AI-weighted risk scores based on attendance, exams, homework & fees
            </p>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw size={15} className={recalculating ? 'animate-spin' : ''} />
            Recalculate All
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['high', 'medium', 'low'].map(b => {
            const cfg = BAND_CONFIG[b];
            const count = summary[b] || 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <button
                key={b}
                onClick={() => setBand(band === b ? '' : b)}
                className={`rounded-2xl p-5 text-left transition-all border-2 ${cfg.bg}
                  ${band === b ? 'border-current shadow-md' : 'border-transparent'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                </div>
                <p className={`text-3xl font-bold ${cfg.text}`}>{count}</p>
                <p className={`text-xs mt-1 ${cfg.text} opacity-70`}>{pct}% of total</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search student…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={band} onChange={e => { setBand(e.target.value); setPage(1); }}
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
          >
            <option value="">All bands</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          {(band || search) && (
            <button onClick={() => { setBand(''); setSearch(''); }} className="text-xs text-indigo-600 hover:underline">Clear</button>
          )}
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} students</span>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Class</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Risk</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-center">Score</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Signals</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">No students found</td></tr>
                ) : paginated.map(s => {
                  const cfg = BAND_CONFIG[s.band] || BAND_CONFIG.low;
                  return (
                    <tr key={s.student_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{s.student_name}</p>
                        <p className="text-xs text-gray-400">{s.roll_number}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">{s.class_name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-bold ${cfg.text}`}>{Math.round(s.score)}</span>
                        <span className="text-xs text-gray-400">/100</span>
                      </td>
                      <td className="px-4 py-3 min-w-48">
                        <div className="space-y-1">
                          {SIGNALS.map(sig => (
                            <div key={sig.key} className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-16">{sig.label}</span>
                              <div className="flex-1"><ScoreBar value={s[sig.key]} color={sig.color} /></div>
                              <span className="text-xs text-gray-500 w-8 text-right">{Math.round(s[sig.key] || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/students/${s.student_id}`)}
                          className="text-indigo-600 hover:text-indigo-700 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                        >
                          <ArrowRight size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="text-sm text-indigo-600 disabled:text-gray-300 hover:underline">Previous</button>
              <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="text-sm text-indigo-600 disabled:text-gray-300 hover:underline">Next</button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
