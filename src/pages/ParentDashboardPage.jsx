import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote, CheckCircle2, NotebookPen, FileBarChart2,
  TrendingUp, AlertTriangle, Video, MessageSquare,
  BookOpen, RefreshCw, ChevronRight, Bell,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { getStudent } from '../api/students';
import { getStudentHistory } from '../api/attendance';
import { getInvoices } from '../api/fees';
import { getMyClasses } from '../api/onlineClasses';
import { getParentFeed } from '../api/parentFeed';
import api from '../api/axios';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const PKR = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days} days ago`;
  return new Date(ts).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
}

const FEED_COLORS = {
  attendance:   'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  homework:     'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  fee_invoice:  'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  fee_payment:  'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
  result:       'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  announcement: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
};

function FeedItem({ item }) {
  const color = FEED_COLORS[item.type] || 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  return (
    <div className={`flex gap-3 px-4 py-3 border-l-2 ${color} mx-4 mb-2 rounded-r-xl`}>
      <span className="text-xl leading-none mt-0.5 shrink-0">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{item.title}</p>
        {item.subtitle && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{item.subtitle}</p>
        )}
      </div>
      <span className="text-[10px] text-slate-400 shrink-0 mt-0.5 whitespace-nowrap">{relativeTime(item.timestamp)}</span>
    </div>
  );
}

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const [child,         setChild]         = useState(null);
  const [attendance,    setAttendance]    = useState([]);
  const [invoices,      setInvoices]      = useState([]);
  const [onlineClasses, setOnlineClasses] = useState([]);
  const [feed,          setFeed]          = useState([]);
  const [feedLoading,   setFeedLoading]   = useState(true);
  const [loading,       setLoading]       = useState(true);

  const childId   = user.entity_id;
  const thisMonth = new Date().toISOString().slice(0, 7);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await getParentFeed({ limit: 40 });
      setFeed(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { /* silent */ }
    setFeedLoading(false);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [childRes, attRes, invRes, ocRes] = await Promise.all([
          childId ? getStudent(childId)                              : Promise.resolve({ data: null }),
          childId ? getStudentHistory(childId, thisMonth)            : Promise.resolve({ data: [] }),
          childId ? getInvoices({ student_id: childId, limit: 10 }) : Promise.resolve({ data: [] }),
          getMyClasses().catch(() => ({ data: [] })),
        ]);

        setChild(childRes.data?.data ?? childRes.data ?? null);
        setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
        setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
        setOnlineClasses(Array.isArray(ocRes.data) ? ocRes.data.slice(0, 4) : []);
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchAll();
    loadFeed();
  }, [childId, loadFeed]);

  const presentDays   = attendance.filter(r => r.status === 'present').length;
  const totalDays     = attendance.length;
  const attendancePct = totalDays ? Math.round((presentDays / totalDays) * 100) : null;

  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'partial');
  const totalDue       = unpaidInvoices.reduce((s, i) => s + Number(i.balance || 0), 0);

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 pt-10 pb-20"
        style={{ background: 'linear-gradient(135deg, #14532d, #166534)' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #4ade80 0%, transparent 60%)' }} />
        <div className="relative max-w-3xl">
          <p className="text-emerald-300 text-sm font-semibold mb-1">{greeting()}</p>
          <h1 className="text-3xl font-extrabold text-white mb-1">{user.name}</h1>
          <p className="text-emerald-200 text-sm">Parent Portal</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 -mt-12 pb-12 space-y-6">

        {/* Child info card */}
        {child ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-md"
              style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
              {(child.name || 'S')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Your Child</p>
              <p className="text-lg font-extrabold text-slate-800 dark:text-white">{child.name}</p>
              <p className="text-sm text-slate-500">
                {child.class_name || '—'} · Roll #{child.roll_number || '—'} · {child.status || 'active'}
              </p>
            </div>
            {/* Quick-action buttons */}
            <div className="flex flex-col gap-2 shrink-0">
              <Link to="/parent-messages"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold transition-colors">
                <MessageSquare size={12} /> Message Teacher
              </Link>
              <Link to="/parent-fee-ledger"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-semibold transition-colors">
                <Banknote size={12} /> Fee Ledger
              </Link>
            </div>
          </div>
        ) : !childId ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              No child linked to your account. Please contact the school admin.
            </p>
          </div>
        ) : null}

        {/* Stat chips */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attendance</p>
            </div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white">
              {attendancePct !== null ? `${attendancePct}%` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{presentDays}/{totalDays} days</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Banknote size={16} className="text-red-500" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Balance</p>
            </div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white">PKR {PKR(totalDue)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{unpaidInvoices.length} invoices</p>
          </div>
          <Link to="/parent-messages"
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:border-emerald-300 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={16} className="text-emerald-500" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Messages</p>
            </div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white">→</p>
            <p className="text-xs text-slate-400 mt-0.5">Contact teachers</p>
          </Link>
          <Link to="/parent-fee-ledger"
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 hover:border-red-300 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <FileBarChart2 size={16} className="text-amber-500" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fee Ledger</p>
            </div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white">→</p>
            <p className="text-xs text-slate-400 mt-0.5">Full history</p>
          </Link>
        </div>

        {/* ── LIVE FEED ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Bell size={16} className="text-emerald-500" />
            <h2 className="font-bold text-slate-800 dark:text-white text-sm flex-1">Live Activity Feed</h2>
            <button
              onClick={loadFeed}
              disabled={feedLoading}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <RefreshCw size={11} className={feedLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {feedLoading && feed.length === 0 ? (
            <div className="py-10 flex items-center justify-center">
              <RefreshCw size={20} className="animate-spin text-slate-300" />
            </div>
          ) : feed.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No recent activity</p>
          ) : (
            <div className="py-3">
              {feed.map((item, i) => <FeedItem key={i} item={item} />)}
            </div>
          )}
        </div>

        {/* Online Classes */}
        {onlineClasses.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Video size={16} className="text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Upcoming Online Classes</h2>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {onlineClasses.map(oc => {
                const isLive = oc.status === 'live';
                const dt     = new Date(oc.scheduled_at);
                const dateStr = dt.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
                const timeStr = dt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
                return (
                  <li key={oc.id} className="px-5 py-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isLive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
                      <Video size={14} className={isLive ? 'text-emerald-600' : 'text-indigo-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{oc.title}</p>
                      <p className="text-[11px] text-slate-400">{oc.subject_name || oc.class_name || '—'} · {oc.teacher_name || ''}</p>
                    </div>
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE
                      </span>
                    ) : (
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{timeStr}</p>
                        <p className="text-[10px] text-slate-400">{dateStr}</p>
                      </div>
                    )}
                    {oc.meeting_link && (
                      <a href={oc.meeting_link} target="_blank" rel="noopener noreferrer"
                        className="ml-1 px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-bold shrink-0 transition-colors">
                        Join
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Attendance bar */}
        {attendance.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Attendance This Month</h2>
              <span className="ml-auto text-[11px] font-semibold text-slate-400">{thisMonth}</span>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${attendancePct || 0}%`, background: 'linear-gradient(90deg, #10b981, #34d399)' }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-white w-10 text-right">{attendancePct ?? 0}%</span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Present: {presentDays}
                </span>
                <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Absent: {totalDays - presentDays}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
