import { useEffect, useState } from 'react';
import {
  Banknote, CheckCircle2, NotebookPen, FileBarChart2,
  TrendingUp, AlertTriangle, User,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { getStudent } from '../api/students';
import { getStudentHistory } from '../api/attendance';
import { getInvoices } from '../api/fees';
import { getHomework } from '../api/homework';
import { getExams } from '../api/exams';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const PKR = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const [child,      setChild]      = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [invoices,   setInvoices]   = useState([]);
  const [homework,   setHomework]   = useState([]);
  const [exams,      setExams]      = useState([]);
  const [loading,    setLoading]    = useState(true);

  // entity_id = child's student_id for parents
  const childId   = user.entity_id;
  const thisMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [childRes, attRes, invRes, hwRes, exRes] = await Promise.all([
          childId ? getStudent(childId)                                : Promise.resolve({ data: null }),
          childId ? getStudentHistory(childId, thisMonth)              : Promise.resolve({ data: [] }),
          childId ? getInvoices({ student_id: childId, limit: 10 })   : Promise.resolve({ data: [] }),
          childId ? getHomework({ limit: 8 })                          : Promise.resolve({ data: [] }),
          getExams({ limit: 5 }),
        ]);

        setChild(childRes.data?.data ?? childRes.data ?? null);
        setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
        setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
        setHomework(Array.isArray(hwRes.data) ? hwRes.data : []);
        setExams(Array.isArray(exRes.data) ? exRes.data : []);
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchAll();
  }, [childId]);

  const presentDays   = attendance.filter(r => r.status === 'present').length;
  const totalDays     = attendance.length;
  const attendancePct = totalDays ? Math.round((presentDays / totalDays) * 100) : null;

  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'partial');
  const totalDue       = unpaidInvoices.reduce((s, i) => s + Number(i.balance || 0), 0);

  const upcomingExams = exams.filter(e => e.status === 'scheduled').slice(0, 3);

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
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Your Child</p>
              <p className="text-lg font-extrabold text-slate-800 dark:text-white">{child.name}</p>
              <p className="text-sm text-slate-500">
                {child.class_name || '—'} · Roll #{child.roll_number || '—'} · {child.status || 'active'}
              </p>
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

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-emerald-500" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attendance</p>
            </div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white">
              {attendancePct !== null ? `${attendancePct}%` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{presentDays}/{totalDays} days this month</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <Banknote size={18} className="text-red-500" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Balance</p>
            </div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white">PKR {PKR(totalDue)}</p>
            <p className="text-xs text-slate-400 mt-1">{unpaidInvoices.length} unpaid invoices</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <NotebookPen size={18} className="text-purple-500" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Homework</p>
            </div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{homework.length}</p>
            <p className="text-xs text-slate-400 mt-1">active assignments</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <FileBarChart2 size={18} className="text-amber-500" />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Upcoming Exams</p>
            </div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{upcomingExams.length}</p>
            <p className="text-xs text-slate-400 mt-1">scheduled</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Fee invoices */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Banknote size={16} className="text-red-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Fee Invoices</h2>
            </div>
            {invoices.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No invoices</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.slice(0, 6).map(inv => (
                  <div key={inv.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {inv.fee_head_name || 'Fee'} — {inv.month || '—'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        PKR {PKR(inv.amount)} · Balance: PKR {PKR(inv.balance)}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : inv.status === 'partial'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>{inv.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Homework */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <NotebookPen size={16} className="text-purple-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Child's Homework</h2>
            </div>
            {homework.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No homework</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {homework.slice(0, 6).map(hw => {
                  const overdue = hw.due_date && new Date(hw.due_date) < new Date();
                  return (
                    <div key={hw.id} className="px-5 py-3 flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${overdue ? 'bg-red-400' : 'bg-emerald-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{hw.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {hw.subject_name || '—'} · Due: {hw.due_date || '—'}
                        </p>
                      </div>
                      {overdue && <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Attendance this month */}
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
                    style={{
                      width: `${attendancePct || 0}%`,
                      background: 'linear-gradient(90deg, #10b981, #34d399)',
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-white w-10 text-right">
                  {attendancePct ?? 0}%
                </span>
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
