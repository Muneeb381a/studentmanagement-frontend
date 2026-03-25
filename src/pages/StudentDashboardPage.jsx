import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote, CheckCircle2, NotebookPen, FileBarChart2,
  AlertTriangle, BookOpen, Calendar, Clock, Star, Zap, FileCheck, Video, ExternalLink,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { getStudent } from '../api/students';
import { getStudentHistory } from '../api/attendance';
import { getInvoices } from '../api/fees';
import { getHomework } from '../api/homework';
import { getExams } from '../api/exams';
import { getMyClasses } from '../api/onlineClasses';
import api from '../api/axios';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const PKR = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

/* ── Circular progress ring ── */
function Ring({ pct = 0, size = 120, stroke = 10, color = '#10b981', children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        strokeWidth={stroke} className="text-slate-100 dark:text-slate-800" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 1s ease' }} />
      <foreignObject x={0} y={0} width={size} height={size}>
        <div className="rotate-90 w-full h-full flex items-center justify-center">
          {children}
        </div>
      </foreignObject>
    </svg>
  );
}

/* ── Gradient stat card ── */
function GradientCard({ icon: Icon, label, value, sub, gradient, iconBg }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: gradient }}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20" style={{ background: 'white' }} />
      <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full opacity-10" style={{ background: 'white' }} />
      <div className="relative">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: iconBg }}>
          <Icon size={18} className="text-white" />
        </div>
        <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-extrabold">{value ?? '—'}</p>
        {sub && <p className="text-white/60 text-[11px] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Subject color map ── */
const SUBJECT_COLORS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
];
const subjectColor = (name = '') => SUBJECT_COLORS[name.charCodeAt(0) % SUBJECT_COLORS.length];

/* ── Days until a date ── */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [student,       setStudent]       = useState(null);
  const [attendance,    setAttendance]    = useState([]);
  const [invoices,      setInvoices]      = useState([]);
  const [homework,      setHomework]      = useState([]);
  const [exams,         setExams]         = useState([]);
  const [quizzes,       setQuizzes]       = useState([]);
  const [onlineClasses, setOnlineClasses] = useState([]);
  const [loading,       setLoading]       = useState(true);

  const thisMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [stuRes, attRes, invRes, hwRes, exRes, qzRes, ocRes] = await Promise.all([
          user.entity_id ? getStudent(user.entity_id)                               : Promise.resolve({ data: null }),
          user.entity_id ? getStudentHistory(user.entity_id, thisMonth)             : Promise.resolve({ data: [] }),
          user.entity_id ? getInvoices({ student_id: user.entity_id, limit: 10 })  : Promise.resolve({ data: [] }),
          getHomework({ limit: 8 }),
          getExams({ limit: 6 }),
          api.get('/quizzes', { params: { status: 'published' } }).catch(() => ({ data: [] })),
          getMyClasses().catch(() => ({ data: [] })),
        ]);
        setStudent(stuRes.data?.data ?? stuRes.data ?? null);
        setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
        setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
        setHomework(Array.isArray(hwRes.data) ? hwRes.data : []);
        setExams(Array.isArray(exRes.data) ? exRes.data : []);
        const qzData = qzRes.data?.data ?? qzRes.data ?? [];
        setQuizzes(Array.isArray(qzData) ? qzData : []);
        setOnlineClasses(Array.isArray(ocRes.data) ? ocRes.data.slice(0, 4) : []);
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchAll();
  }, [user.entity_id]);

  const presentDays    = attendance.filter(r => r.status === 'present').length;
  const absentDays     = attendance.filter(r => r.status === 'absent').length;
  const totalDays      = attendance.length;
  const attendancePct  = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'partial');
  const totalDue       = unpaidInvoices.reduce((s, i) => s + Number(i.balance || 0), 0);

  const activeHomework = homework.filter(h => h.status !== 'graded').slice(0, 5);
  const upcomingExams  = exams.filter(e => e.status === 'scheduled')
    .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
    .slice(0, 4);

  const ringColor = attendancePct >= 80 ? '#10b981' : attendancePct >= 60 ? '#f59e0b' : '#ef4444';

  const initials = user.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'S';

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
        {/* Animated blobs */}
        <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-56 h-56 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #38bdf8, transparent)' }} />
        <div className="absolute top-1/2 right-10 w-40 h-40 rounded-full opacity-10 blur-2xl"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative px-6 pt-10 pb-24 flex items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {initials}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center">
              <Star size={10} className="text-white fill-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-indigo-300 text-xs font-semibold tracking-widest uppercase mb-1">{greeting()}</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white truncate">{user.name}</h1>
            {student && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-sky-200 border border-white/10">
                  <BookOpen size={11} /> {student.class_name || 'Student'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-purple-200 border border-white/10">
                  Roll #{student.roll_number || '—'}
                </span>
                {student.section && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-200 border border-white/10">
                    Section {student.section}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 -mt-14 pb-12 space-y-6">

        {/* ── Gradient stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GradientCard
            icon={CheckCircle2}
            label="Attendance"
            value={attendancePct ? `${attendancePct}%` : '—'}
            sub={`${presentDays} / ${totalDays} days`}
            gradient="linear-gradient(135deg, #059669, #10b981)"
            iconBg="rgba(255,255,255,0.2)"
          />
          <GradientCard
            icon={Banknote}
            label="Due Balance"
            value={totalDue ? `PKR ${PKR(totalDue)}` : 'Clear'}
            sub={unpaidInvoices.length ? `${unpaidInvoices.length} unpaid` : 'All paid'}
            gradient={totalDue ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #059669, #10b981)'}
            iconBg="rgba(255,255,255,0.2)"
          />
          <GradientCard
            icon={NotebookPen}
            label="Homework"
            value={activeHomework.length}
            sub="pending tasks"
            gradient="linear-gradient(135deg, #7c3aed, #8b5cf6)"
            iconBg="rgba(255,255,255,0.2)"
          />
          <GradientCard
            icon={FileBarChart2}
            label="Upcoming Exams"
            value={upcomingExams.length}
            sub="scheduled"
            gradient="linear-gradient(135deg, #d97706, #f59e0b)"
            iconBg="rgba(255,255,255,0.2)"
          />
        </div>

        {/* ── Attendance ring + calendar ── */}
        {attendance.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Calendar size={16} className="text-emerald-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Attendance — {thisMonth}</h2>
            </div>
            <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
              {/* Ring */}
              <div className="relative shrink-0">
                <Ring pct={attendancePct} size={130} stroke={12} color={ringColor}>
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{attendancePct}%</p>
                    <p className="text-[10px] text-slate-400 font-medium">present</p>
                  </div>
                </Ring>
              </div>

              {/* Stats + dots */}
              <div className="flex-1 w-full">
                <div className="flex gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Present <span className="text-emerald-500">{presentDays}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Absent <span className="text-red-500">{absentDays}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Total {totalDays}</span>
                  </div>
                </div>

                {/* Dot calendar */}
                <div className="flex flex-wrap gap-1.5">
                  {attendance.map((rec, i) => {
                    const color =
                      rec.status === 'present' ? 'bg-emerald-400' :
                      rec.status === 'absent'  ? 'bg-red-400' :
                      rec.status === 'leave'   ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-700';
                    const day = rec.date ? new Date(rec.date).getDate() : i + 1;
                    return (
                      <div key={i} title={`Day ${day}: ${rec.status}`}
                        className={`w-6 h-6 rounded-md ${color} flex items-center justify-center text-white text-[9px] font-bold cursor-default`}>
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Upcoming Exams ── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <FileBarChart2 size={16} className="text-amber-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Upcoming Exams</h2>
            </div>
            {upcomingExams.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <FileBarChart2 size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                <p className="text-sm text-slate-400">No exams scheduled</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {upcomingExams.map(exam => {
                  const days = daysUntil(exam.exam_date);
                  const urgent = days !== null && days <= 3;
                  const soon   = days !== null && days <= 7;
                  return (
                    <div key={exam.id}
                      className={`rounded-xl p-4 border flex items-center gap-3 ${
                        urgent ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' :
                        soon   ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' :
                                 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                      }`}>
                      {/* Countdown */}
                      <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white font-extrabold ${
                        urgent ? 'bg-red-500' : soon ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}>
                        <span className="text-lg leading-none">{days ?? '?'}</span>
                        <span className="text-[9px] font-semibold opacity-80">days</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{exam.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {exam.subject_name || exam.class_name || '—'} · {exam.exam_date || '—'}
                        </p>
                      </div>
                      {urgent && <Zap size={14} className="text-red-500 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Homework ── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <NotebookPen size={16} className="text-violet-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Homework</h2>
              {activeHomework.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                  {activeHomework.length} pending
                </span>
              )}
            </div>
            {homework.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <NotebookPen size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                <p className="text-sm text-slate-400">No homework found</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {homework.slice(0, 6).map(hw => {
                  const days = daysUntil(hw.due_date);
                  const overdue = days !== null && days < 0;
                  const urgent  = days !== null && days <= 1 && days >= 0;
                  return (
                    <div key={hw.id}
                      className="rounded-xl px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        overdue ? 'bg-red-400' : urgent ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{hw.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {hw.subject_name && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${subjectColor(hw.subject_name)}`}>
                              {hw.subject_name}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={9} />
                            {hw.due_date || '—'}
                          </span>
                        </div>
                      </div>
                      {overdue && <AlertTriangle size={13} className="text-red-400 shrink-0" />}
                      {!overdue && hw.status === 'graded' && <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Fee Status ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Banknote size={16} className="text-red-500" />
            <h2 className="font-bold text-slate-800 dark:text-white text-sm">Fee Status</h2>
            {totalDue > 0 && (
              <span className="ml-auto text-xs font-bold text-red-600 dark:text-red-400">
                PKR {PKR(totalDue)} due
              </span>
            )}
          </div>
          {invoices.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Banknote size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
              <p className="text-sm text-slate-400">No invoices found</p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {invoices.slice(0, 6).map(inv => (
                <div key={inv.id}
                  className={`rounded-xl p-4 border ${
                    inv.status === 'paid'
                      ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800'
                      : inv.status === 'partial'
                      ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
                      : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
                  }`}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate flex-1">
                      {inv.invoice_no || (inv.invoice_type === 'monthly' ? 'Monthly Fee' : inv.invoice_type === 'admission' ? 'Admission Fee' : 'Fee')}
                    </p>
                    <span className={`text-[10px] font-extrabold ml-2 px-2 py-0.5 rounded-full ${
                      inv.status === 'paid'
                        ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : inv.status === 'partial'
                        ? 'bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                        : 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    }`}>{inv.status}</span>
                  </div>
                  <p className="text-lg font-extrabold text-slate-800 dark:text-white">PKR {PKR(inv.net_amount || inv.total_amount)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{inv.billing_month || '—'}</p>
                  {Number(inv.balance) > 0 && (
                    <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1">
                      Balance: PKR {PKR(inv.balance)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Active Quizzes ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <FileCheck size={16} className="text-indigo-500" />
            <h2 className="font-bold text-slate-800 dark:text-white text-sm">Active Quizzes</h2>
            {quizzes.length > 0 && (
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                {quizzes.length} available
              </span>
            )}
          </div>
          {quizzes.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <FileCheck size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
              <p className="text-sm text-slate-400">No active quizzes right now</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {quizzes.slice(0, 5).map(qz => (
                <div key={qz.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <FileCheck size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{qz.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {qz.subject_name && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                          {qz.subject_name}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={9} /> {qz.duration_min || '—'} min
                      </span>
                    </div>
                  </div>
                  <Link to={`/quizzes/${qz.id}/take`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-semibold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    Take Quiz
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Online Classes widget */}
        {onlineClasses.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Video size={16} className="text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Upcoming Online Classes</h2>
              <Link to="/online-classes"
                className="ml-auto text-[11px] font-semibold text-indigo-500 hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {onlineClasses.map(oc => {
                const isLive = oc.status === 'live';
                return (
                  <div key={oc.id} className={`px-5 py-3 flex items-center gap-3 ${isLive ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                    <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0 ${isLive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
                      {isLive
                        ? <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        : <>
                            <span className="text-[9px] font-bold text-indigo-500 leading-none">
                              {new Date(oc.scheduled_at).toLocaleDateString('en',{month:'short'}).toUpperCase()}
                            </span>
                            <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">
                              {new Date(oc.scheduled_at).getDate()}
                            </span>
                          </>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{oc.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {isLive ? '🔴 Live now' : new Date(oc.scheduled_at).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}
                        {oc.teacher_name ? ` · ${oc.teacher_name}` : ''}
                        {' · '}{oc.duration_minutes}min
                      </p>
                    </div>
                    {oc.meeting_link && (
                      <a href={oc.meeting_link} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 ${
                          isLive
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}>
                        <ExternalLink size={11} />
                        {isLive ? 'Join Now' : 'Join'}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
