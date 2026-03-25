import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, UserCheck, GraduationCap, Plus, ArrowRight,
  ClipboardList, Banknote, CalendarDays, ClipboardCheck,
  TrendingUp, Activity, Library, FileBarChart2, ChevronRight,
  AlertTriangle, CheckCircle2, Clock3, Wallet, DollarSign,
  Calendar, BookMarked, UserX, BarChart3, RefreshCw, Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { getStudents }       from '../api/students';
import { getClasses }        from '../api/classes';
import { getTeachers }       from '../api/teachers';
import { getExams }          from '../api/exams';
import { getDashboardStats } from '../api/dashboard';
import { getDashboardStats as getFeeStats } from '../api/fees';
import { getOnlineClasses } from '../api/onlineClasses';
import { formatDate, toPct, getInitials, pickGradient } from '../utils';
import { AVATAR_GRADIENTS } from '../constants';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
function todayStr() {
  return new Date().toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

const PKR = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

const STATUS_CHIP = {
  active:    { bg: '#d1fae5', color: '#065f46' },
  inactive:  { bg: '#f1f5f9', color: '#475569' },
  suspended: { bg: '#fee2e2', color: '#991b1b' },
  graduated: { bg: '#e0e7ff', color: '#3730a3' },
};
const EXAM_STATUS_CLS = {
  scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ongoing:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};
const EVENT_COLORS = {
  holiday:    '#ef4444', exam: '#f59e0b', sports: '#10b981',
  ceremony:   '#8b5cf6', meeting: '#3b82f6', other: '#6b7280',
};

// ─────────────────────────────────────────────────────────────
//  Bar Chart (pure CSS — no library)
// ─────────────────────────────────────────────────────────────
function MonthlyChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
  );
  const maxVal = Math.max(...data.flatMap(d => [d.fees, d.expenses]), 1);

  return (
    <div className="pt-2">
      <div className="flex items-end gap-1.5 h-32">
        {data.map((d) => {
          const feePct  = Math.round((d.fees     / maxVal) * 100);
          const expPct  = Math.round((d.expenses / maxVal) * 100);
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5 group">
              <div className="w-full flex items-end justify-center gap-0.5 h-28 relative">
                {/* Tooltip */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none
                  bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-xl min-w-[110px]">
                  <div className="font-semibold mb-0.5">{d.label}</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" /> Fees: PKR {PKR(d.fees)}</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> Expenses: PKR {PKR(d.expenses)}</div>
                </div>
                {/* Fee bar */}
                <div className="w-5/12 rounded-t-md transition-all duration-500 bg-gradient-to-t from-emerald-500 to-emerald-400"
                  style={{ height: `${feePct}%`, minHeight: d.fees > 0 ? 4 : 0 }} />
                {/* Expense bar */}
                <div className="w-5/12 rounded-t-md transition-all duration-500 bg-gradient-to-t from-red-500 to-red-400"
                  style={{ height: `${expPct}%`, minHeight: d.expenses > 0 ? 4 : 0 }} />
              </div>
              <span className="text-[9px] text-slate-400 font-medium">{d.label}</span>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-center">
        {[['bg-emerald-400','Fees Collected'],['bg-red-400','Expenses']].map(([cls, lbl]) => (
          <div key={lbl} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${cls}`} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  KPI Card
// ─────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, pct, iconBg, from, to, warn }) {
  const pctColor = pct == null ? '#94a3b8' : pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <div className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-default ${warn ? 'border-amber-300 dark:border-amber-800' : 'border-slate-200/80 dark:border-slate-800'}`}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right,${from},${to})` }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-extrabold mt-1 leading-none tracking-tight"
              style={{ background: `linear-gradient(135deg,${from},${to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {value}
            </p>
            {sub && <p className="text-[10px] text-slate-400 mt-1.5 font-medium truncate">{sub}</p>}
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
            <Icon size={18} style={{ color: from }} />
          </div>
        </div>
        {pct != null && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400">rate</span>
              <span className="text-[10px] font-bold" style={{ color: pctColor }}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: `linear-gradient(to right,${from},${to})` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Alert Pill
// ─────────────────────────────────────────────────────────────
function AlertPill({ icon: Icon, count, label, color, onClick }) {
  if (!count) return null;
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all hover:shadow-md"
      style={{ background: `${color}15`, borderColor: `${color}40`, color }}>
      <Icon size={14} />
      <span className="font-bold">{count}</span>
      <span className="text-xs opacity-80">{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const [students,   setStudents]   = useState([]);
  const [classes,    setClasses]    = useState([]);
  const [teachers,   setTeachers]   = useState([]);
  const [exams,      setExams]      = useState([]);
  const [feeStats,      setFeeStats]      = useState(null);
  const [onlineClasses, setOnlineClasses] = useState([]);
  const [dash,          setDash]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [dashLoading,setDashLoading]= useState(false);

  const loadDash = () => {
    setDashLoading(true);
    getDashboardStats()
      .then(r => { const d = r.data?.data ?? r.data; setDash(d || null); })
      .catch(() => toast.error('Failed to load live stats'))
      .finally(() => setDashLoading(false));
  };

  useEffect(() => {
    Promise.all([
      getStudents(),
      getClasses(),
      getTeachers(),
      getExams(),
      getFeeStats().catch(() => ({ data: null })),
      getOnlineClasses({ upcoming: 'true' }).catch(() => ({ data: [] })),
    ]).then(([s, c, t, e, f, oc]) => {
      setStudents(Array.isArray(s.data) ? s.data : []);
      setClasses(Array.isArray(c.data) ? c.data : []);
      setTeachers(Array.isArray(t.data) ? t.data : []);
      setExams(Array.isArray(e.data) ? e.data : []);
      setFeeStats(f.data?.data ?? f.data);
      setOnlineClasses(Array.isArray(oc.data) ? oc.data.slice(0, 5) : []);
    }).catch(() => {}).finally(() => setLoading(false));

    loadDash();
  }, []);

  // Use accurate counts from the dashboard stats API (avoids pagination cap of 50)
  const counts        = dash?.counts;
  const total         = counts?.total_students  ?? students.length;
  const active        = counts?.total_students  ?? students.filter(s => s.status === 'active').length;
  const males         = counts?.male_students   ?? students.filter(s => s.gender === 'Male').length;
  const females       = counts?.female_students ?? students.filter(s => s.gender === 'Female').length;
  const activeTeach   = counts?.total_teachers  ?? teachers.filter(t => t.status === 'active').length;
  const totalClasses  = counts?.total_classes   ?? classes.length;
  const inactive      = students.filter(s => s.status === 'inactive').length;
  const suspended     = students.filter(s => s.status === 'suspended').length;
  const graduated     = students.filter(s => s.status === 'graduated').length;
  const recentStuds   = [...students].reverse().slice(0, 6);
  const upcomingExams = exams.filter(e => e.status !== 'completed').slice(0, 4);
  const ongoingExams  = exams.filter(e => e.status === 'ongoing').length;
  const malePct       = toPct(males,   total);
  const femalePct     = toPct(females, total);
  const otherPct      = Math.max(0, 100 - malePct - femalePct);

  const kpis  = dash?.kpis;
  const chart = dash?.chart;
  const today = dash?.today_panel;
  const alerts= dash?.alerts;
  const totalAlerts = (alerts?.fee_defaulters || 0) + (alerts?.chronic_absent || 0) + (alerts?.overdue_books || 0);

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* ══ HERO ══ */}
        <div
          className="relative overflow-hidden px-6 sm:px-8 pt-10 pb-24"
          style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 35%,#4f46e5 70%,#7c3aed 100%)' }}
        >
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/70 text-[11px] font-semibold uppercase tracking-widest">SchoolMS</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                {greeting()} 👋
              </h1>
              <p className="text-white/50 text-sm mt-1.5 font-medium">{todayStr()}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { value: total,         label: 'Students', color: 'from-indigo-300 to-purple-300' },
                { value: activeTeach,   label: 'Teachers', color: 'from-emerald-300 to-teal-300'  },
                { value: totalClasses,  label: 'Classes',  color: 'from-amber-300 to-orange-300'  },
                { value: ongoingExams,   label: 'Ongoing Exams', color: 'from-pink-300 to-rose-300'     },
              ].map(({ value, label, color }) => (
                <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-3 text-center min-w-[80px]">
                  <p className={`text-2xl font-extrabold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{value}</p>
                  <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 -mt-12 pb-12 space-y-6">

          {/* ══ ALERTS BAR ══ */}
          {totalAlerts > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800/50 shadow-sm px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mr-1">
                  <AlertTriangle size={15} />
                  <span className="text-xs font-bold uppercase tracking-wide">Needs Attention</span>
                </div>
                <AlertPill icon={Banknote}   count={alerts?.fee_defaulters} label="fee defaulters"    color="#dc2626" onClick={() => navigate('/fees')} />
                <AlertPill icon={UserX}      count={alerts?.chronic_absent}  label="chronic absentees" color="#d97706" onClick={() => navigate('/attendance')} />
                <AlertPill icon={BookMarked} count={alerts?.overdue_books}   label="overdue books"    color="#7c3aed" onClick={() => navigate('/library')} />
              </div>
            </div>
          )}

          {/* ══ LIVE KPI CARDS ══ */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <BigStatCard label="Total Students"  value={total}        icon={Users}         sub="All enrollments"         from="#6366f1" to="#8b5cf6" iconCls="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
            <BigStatCard label="Active Students" value={active}       icon={UserCheck}     pct={toPct(active, total)}    from="#10b981" to="#0d9488" iconCls="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
            <BigStatCard label="Total Teachers"  value={activeTeach}  icon={GraduationCap} sub="Active teachers"          from="#f59e0b" to="#f97316" iconCls="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" />
            <BigStatCard label="Total Classes"   value={totalClasses} icon={BookOpen}      sub="Across all grades"       from="#3b82f6" to="#06b6d4" iconCls="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" />
          </div>

          {/* ══ LIVE KPI ROW 2 — real-time data ══ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <KpiCard
              icon={ClipboardCheck}
              label="Attendance Today"
              value={kpis?.attendance_today_pct != null ? `${kpis.attendance_today_pct}%` : '—'}
              sub={kpis ? `${kpis.attendance_present} present · ${kpis.attendance_marked}/${kpis.attendance_total} marked` : 'Loading…'}
              pct={kpis?.attendance_today_pct}
              iconBg="#f0fdf4"
              from="#10b981" to="#0d9488"
              warn={kpis?.attendance_today_pct != null && kpis.attendance_today_pct < 75}
            />
            <KpiCard
              icon={Wallet}
              label="Fee Collection (This Month)"
              value={kpis?.fee_collection_pct != null ? `${kpis.fee_collection_pct}%` : '—'}
              sub={kpis ? `PKR ${PKR(kpis.fee_collected)} of PKR ${PKR(kpis.fee_invoiced)}` : 'Loading…'}
              pct={kpis?.fee_collection_pct}
              iconBg="#f0fdf4"
              from="#059669" to="#0d9488"
              warn={kpis?.fee_collection_pct != null && kpis.fee_collection_pct < 60}
            />
            <KpiCard
              icon={DollarSign}
              label="Pending Salaries"
              value={kpis != null ? kpis.pending_salaries : '—'}
              sub={kpis?.pending_salaries > 0 ? 'Teachers awaiting payment' : 'All salaries settled'}
              iconBg="#fef3c7"
              from="#d97706" to="#f59e0b"
              warn={kpis?.pending_salaries > 0}
            />
            {/* Refresh button */}
            <button onClick={loadDash} disabled={dashLoading}
              className="hidden sm:flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors col-span-3 mt-1">
              <RefreshCw size={12} className={dashLoading ? 'animate-spin' : ''} />
              Refresh live data
            </button>
          </div>

          {/* ══ MAIN GRID ══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

            {/* Recent Students — spans 2 cols */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <SectionHeader
                title="Recent Enrollments" sub="Latest students added"
                icon={Users} iconCls="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                action={{ label: 'View all', fn: () => navigate('/students') }}
              />
              {recentStuds.length === 0 ? (
                <EmptySlot msg="No students enrolled yet." />
              ) : (
                <ul className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {recentStuds.map(s => {
                    const [from, to] = pickGradient(s.id, AVATAR_GRADIENTS);
                    const chip = STATUS_CHIP[s.status] || STATUS_CHIP.inactive;
                    return (
                      <li key={s.id}
                        onClick={() => navigate(`/admission/edit/${s.id}`)}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group">
                        <div className="w-9 h-9 rounded-xl text-xs font-bold text-white flex items-center justify-center shrink-0 shadow-sm"
                          style={{ background: `linear-gradient(135deg,${from},${to})` }}>
                          {getInitials(s.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{s.full_name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                            {s.grade || '—'}{s.section ? ` · Sec ${s.section}` : ''}{s.roll_number ? ` · Roll ${s.roll_number}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                            style={{ background: chip.bg, color: chip.color }}>{s.status}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(s.admission_date)}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors ml-1 shrink-0" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
                <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-indigo-500" /> Quick Actions
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Add Student', sub: 'Enroll new',    Icon: Plus,          path: '/admission/new', from: '#6366f1', to: '#8b5cf6' },
                    { label: 'Attendance',  sub: 'Mark today',    Icon: ClipboardCheck, path: '/attendance',   from: '#10b981', to: '#0d9488' },
                    { label: 'Exams',       sub: 'Manage exams',  Icon: FileBarChart2, path: '/exams',        from: '#f59e0b', to: '#f97316' },
                    { label: 'Fees',        sub: 'View invoices', Icon: Banknote,      path: '/fees',         from: '#3b82f6', to: '#06b6d4' },
                    { label: 'Timetable',   sub: 'Class schedule',Icon: CalendarDays,  path: '/timetable',    from: '#ec4899', to: '#f43f5e' },
                    { label: 'Subjects',    sub: 'Manage',        Icon: Library,       path: '/subjects',     from: '#84cc16', to: '#10b981' },
                  ].map(({ label, sub, Icon, path, from, to }) => (
                    <ActionTile key={label} label={label} sub={sub} Icon={Icon} from={from} to={to} onClick={() => navigate(path)} />
                  ))}
                </div>
              </div>

              {/* Exams */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <SectionHeader
                  title="Exams" sub="Active & upcoming"
                  icon={FileBarChart2} iconCls="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                  action={{ label: 'All exams', fn: () => navigate('/exams') }}
                />
                {upcomingExams.length === 0 ? (
                  <EmptySlot msg="No upcoming exams." />
                ) : (
                  <ul className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {upcomingExams.map(exam => (
                      <li key={exam.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'linear-gradient(135deg,#f59e0b22,#f9731622)' }}>
                          <ClipboardList size={13} className="text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{exam.exam_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(exam.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            {exam.start_date !== exam.end_date && ` → ${new Date(exam.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 ${EXAM_STATUS_CLS[exam.status] || EXAM_STATUS_CLS.scheduled}`}>
                          {exam.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* ══ TODAY'S PANEL + CHART ══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

            {/* Income vs Expenses Bar Chart — spans 2 cols */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                    <BarChart3 size={14} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white leading-none">Income vs Expenses</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Last 6 months</p>
                  </div>
                </div>
              </div>
              <MonthlyChart data={chart} />
            </div>

            {/* Today's Panel */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-500" /> Today's Panel
                </h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">

                {/* Unmarked classes */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <ClipboardCheck size={12} className="text-amber-500" />
                      Attendance Not Marked
                    </span>
                    {today?.unmarked_classes?.length > 0 && (
                      <button onClick={() => navigate('/attendance')}
                        className="text-[10px] text-indigo-500 hover:underline font-medium">Mark now</button>
                    )}
                  </div>
                  {!today ? (
                    <p className="text-xs text-slate-400">Loading…</p>
                  ) : today.unmarked_classes.length === 0 ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={13} />
                      <span className="text-xs font-medium">All classes marked!</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {today.unmarked_classes.slice(0, 4).map(c => (
                        <div key={c.id} className="flex items-center justify-between py-0.5">
                          <span className="text-xs text-slate-700 dark:text-slate-300">{c.name}</span>
                          <span className="text-[10px] text-slate-400">{c.student_count} students</span>
                        </div>
                      ))}
                      {today.unmarked_classes.length > 4 && (
                        <p className="text-[10px] text-slate-400">+{today.unmarked_classes.length - 4} more</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Overdue homework */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <BookOpen size={12} className="text-red-500" />
                      Overdue Homework
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      !today ? '' :
                      today.overdue_homework > 0
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                    }`}>
                      {today == null ? '…' : today.overdue_homework}
                    </span>
                  </div>
                </div>

                {/* Upcoming events */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock3 size={12} className="text-purple-500" />
                      This Week's Events
                    </span>
                    <button onClick={() => navigate('/events')}
                      className="text-[10px] text-indigo-500 hover:underline font-medium">View all</button>
                  </div>
                  {!today ? (
                    <p className="text-xs text-slate-400">Loading…</p>
                  ) : today.upcoming_events.length === 0 ? (
                    <p className="text-xs text-slate-400">No events this week</p>
                  ) : (
                    <div className="space-y-1.5">
                      {today.upcoming_events.map(ev => {
                        const evColor = EVENT_COLORS[ev.event_type] || EVENT_COLORS.other;
                        return (
                          <div key={ev.id} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: evColor }} />
                            <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{ev.title}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ══ ANALYTICS ROW ══ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">

            {/* Gender Distribution */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center">
                  <Users size={13} className="text-pink-600 dark:text-pink-400" />
                </span>
                Gender Distribution
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Male',   value: males,              pct: malePct,   from: '#3b82f6', to: '#06b6d4' },
                  { label: 'Female', value: females,            pct: femalePct, from: '#ec4899', to: '#f43f5e' },
                  { label: 'Other',  value: total-males-females, pct: otherPct, from: '#8b5cf6', to: '#a855f7' },
                ].map(({ label, value, pct, from, to }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {value} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: `linear-gradient(to right,${from},${to})` }} />
                    </div>
                  </div>
                ))}
              </div>
              {total > 0 && (
                <div className="flex items-center justify-center mt-6">
                  <div className="relative w-24 h-24">
                    <div className="w-24 h-24 rounded-full"
                      style={{
                        background: `conic-gradient(#3b82f6 0% ${malePct}%,#ec4899 ${malePct}% ${malePct+femalePct}%,#8b5cf6 ${malePct+femalePct}% 100%)`,
                        boxShadow: '0 0 0 6px white,0 0 0 7px #e2e8f0',
                      }} />
                    <div className="absolute inset-0 m-5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Student Status */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <TrendingUp size={13} className="text-emerald-600 dark:text-emerald-400" />
                </span>
                Student Status
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Active',    value: active,    from: '#10b981', to: '#0d9488' },
                  { label: 'Inactive',  value: inactive,  from: '#94a3b8', to: '#64748b' },
                  { label: 'Graduated', value: graduated, from: '#6366f1', to: '#8b5cf6' },
                  { label: 'Suspended', value: suspended, from: '#ef4444', to: '#f97316' },
                ].map(({ label, value, from, to }) => {
                  const pct = toPct(value, total);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: from }} />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{value}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: `linear-gradient(to right,${from},${to})` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-5">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">{toPct(active, total)}%</p>
                  <p className="text-[10px] font-semibold text-emerald-600/60 dark:text-emerald-500 uppercase tracking-wide">Active</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-lg font-extrabold text-indigo-700 dark:text-indigo-400">{toPct(graduated, total)}%</p>
                  <p className="text-[10px] font-semibold text-indigo-600/60 dark:text-indigo-500 uppercase tracking-wide">Grad.</p>
                </div>
              </div>
            </div>

            {/* Class Enrollment */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <SectionHeader
                title="Class Enrollment" sub={`${totalClasses} active classes`}
                icon={BookOpen} iconCls="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                action={{ label: 'Manage', fn: () => navigate('/classes') }}
              />
              {classes.length === 0 ? (
                <EmptySlot msg="No classes created yet." />
              ) : (
                <ul className="divide-y divide-slate-50 dark:divide-slate-800/60 max-h-72 overflow-y-auto">
                  {classes.map((c, i) => {
                    const count = c.student_count || 0;
                    const cap   = c.capacity || 40;
                    const fill  = toPct(count, cap);
                    const near  = fill >= 80;
                    const [from, to] = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
                    return (
                      <li key={c.id}
                        onClick={() => navigate(`/classes/${c.id}`)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 cursor-pointer transition-colors group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                          style={{ background: `linear-gradient(135deg,${from},${to})` }}>
                          {c.section || (c.grade || 'C').slice(-1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{c.name}</p>
                            <span className={`text-[10px] font-bold ml-2 shrink-0 ${near ? 'text-orange-500' : 'text-slate-400'}`}>{count}/{cap}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${fill}%`, background: near ? 'linear-gradient(to right,#f59e0b,#ef4444)' : `linear-gradient(to right,${from},${to})` }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* ══ TEACHERS STRIP ══ */}
          {(teachers.length > 0 || activeTeach > 0) && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <SectionHeader
                title="Teaching Staff" sub={`${activeTeach} active`}
                icon={GraduationCap} iconCls="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                action={{ label: 'View all', fn: () => navigate('/teachers') }}
              />
              <div className="px-5 py-4 flex gap-4 overflow-x-auto pb-5">
                {teachers.slice(0, 12).map(t => {
                  const [from, to] = pickGradient(t.id, AVATAR_GRADIENTS);
                  return (
                    <button key={t.id} onClick={() => navigate(`/teachers/${t.id}`)}
                      className="flex flex-col items-center gap-1.5 group shrink-0">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-2xl text-xs font-bold text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200"
                          style={{ background: `linear-gradient(135deg,${from},${to})` }}>
                          {getInitials(t.full_name)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${t.status === 'active' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-medium max-w-[56px] text-center leading-tight truncate">
                        {t.full_name.split(' ')[0]}
                      </p>
                    </button>
                  );
                })}
                {activeTeach > 12 && (
                  <button onClick={() => navigate('/teachers')} className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-500">
                      +{activeTeach - 12}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">More</p>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ══ ONLINE CLASSES ══ */}
          {onlineClasses.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <SectionHeader
                title="Upcoming Online Classes" sub="Next scheduled virtual sessions"
                icon={Video} iconCls="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                action={{ label: 'View all', fn: () => navigate('/online-classes') }}
              />
              <ul className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {onlineClasses.map(oc => {
                  const isLive = oc.status === 'live';
                  const dt = new Date(oc.scheduled_at);
                  const dateStr = dt.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
                  const timeStr = dt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <li key={oc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isLive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
                        <Video size={14} className={isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-500 dark:text-indigo-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{oc.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {oc.class_name || oc.subject_name ? `${oc.class_name || ''}${oc.subject_name ? ' · ' + oc.subject_name : ''}` : 'All'}
                          {' · '}{oc.teacher_name || ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : (
                          <>
                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{timeStr}</p>
                            <p className="text-[10px] text-slate-400">{dateStr}</p>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ══ FEE OVERVIEW ══ */}
          {feeStats && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
              <SectionHeader
                title="Fee Overview" sub="Financial summary"
                icon={Banknote} iconCls="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                action={{ label: 'View fees', fn: () => navigate('/fees') }}
                compact
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'Total Invoiced',  value: `PKR ${Number(feeStats.total_billed     || 0).toLocaleString()}`, cls: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' },
                  { label: 'Collected',       value: `PKR ${Number(feeStats.total_collected  || 0).toLocaleString()}`, cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
                  { label: 'Outstanding',     value: `PKR ${Number(feeStats.total_pending    || 0).toLocaleString()}`, cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
                  { label: 'Unpaid Invoices', value: feeStats.unpaid_count || 0,                                       cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className={`${cls} rounded-xl p-3`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">{label}</p>
                    <p className="text-sm font-extrabold mt-1 truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────
function BigStatCard({ label, value, icon: Icon, sub, pct, from, to, iconCls }) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 group cursor-default">
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(to right,${from},${to})` }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">{label}</p>
            <p className="text-3xl font-extrabold mt-2 leading-none tracking-tight"
              style={{ background: `linear-gradient(135deg,${from},${to})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {value}
            </p>
            {sub && <p className="text-xs text-slate-400 dark:text-slate-600 mt-2 font-medium">{sub}</p>}
          </div>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconCls} group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={20} />
          </div>
        </div>
        {pct !== undefined && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-slate-400">of total</span>
              <span className="text-[10px] font-bold" style={{ color: from }}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: `linear-gradient(to right,${from},${to})` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, icon: Icon, iconCls, action, compact = false }) {
  return (
    <div className={`flex items-center justify-between ${compact ? 'mb-1' : 'px-5 py-4 border-b border-slate-100 dark:border-slate-800'}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
            <Icon size={14} />
          </div>
        )}
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-white leading-none">{title}</h2>
          {sub && <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-0.5">{sub}</p>}
        </div>
      </div>
      {action && (
        <button onClick={action.fn}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">
          {action.label} <ArrowRight size={11} />
        </button>
      )}
    </div>
  );
}

function ActionTile({ label, sub, Icon, from, to, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex flex-col items-start p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-transparent hover:shadow-md transition-all duration-200 text-left"
      style={{ background: hov ? `linear-gradient(135deg,${from},${to})` : '' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
        style={{ background: hov ? 'rgba(255,255,255,0.2)' : `${from}22` }}>
        <Icon size={14} style={{ color: hov ? '#fff' : from }} />
      </div>
      <p className={`text-xs font-bold leading-tight ${hov ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{label}</p>
      <p className={`text-[10px] mt-0.5 ${hov ? 'text-white/70' : 'text-slate-400'}`}>{sub}</p>
    </button>
  );
}

function EmptySlot({ msg }) {
  return <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-600">{msg}</div>;
}
