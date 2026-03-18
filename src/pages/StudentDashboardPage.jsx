import { useEffect, useState } from 'react';
import {
  Banknote, CheckCircle2, NotebookPen, FileBarChart2,
  TrendingUp, AlertTriangle, Clock, BookOpen,
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

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
          <Icon size={18} style={{ color }} />
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

const PKR = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [student,    setStudent]    = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [invoices,   setInvoices]   = useState([]);
  const [homework,   setHomework]   = useState([]);
  const [exams,      setExams]      = useState([]);
  const [loading,    setLoading]    = useState(true);

  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [stuRes, attRes, invRes, hwRes, exRes] = await Promise.all([
          user.entity_id ? getStudent(user.entity_id)                               : Promise.resolve({ data: null }),
          user.entity_id ? getStudentHistory(user.entity_id, thisMonth)             : Promise.resolve({ data: [] }),
          user.entity_id ? getInvoices({ student_id: user.entity_id, limit: 10 })  : Promise.resolve({ data: [] }),
          getHomework({ limit: 8 }),
          getExams({ limit: 5 }),
        ]);

        setStudent(stuRes.data?.data ?? stuRes.data ?? null);
        setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
        setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
        setHomework(Array.isArray(hwRes.data) ? hwRes.data : []);
        setExams(Array.isArray(exRes.data) ? exRes.data : []);
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchAll();
  }, [user.entity_id]);

  // Compute stats
  const presentDays  = attendance.filter(r => r.status === 'present').length;
  const totalDays    = attendance.length;
  const attendancePct = totalDays ? Math.round((presentDays / totalDays) * 100) : null;

  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'partial');
  const totalDue       = unpaidInvoices.reduce((s, i) => s + Number(i.balance || 0), 0);

  const activeHomework = homework.filter(h => h.status !== 'graded').slice(0, 5);
  const upcomingExams  = exams.filter(e => e.status === 'scheduled').slice(0, 3);

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 pt-10 pb-20"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #38bdf8 0%, transparent 60%)' }} />
        <div className="relative max-w-3xl">
          <p className="text-sky-300 text-sm font-semibold mb-1">{greeting()}</p>
          <h1 className="text-3xl font-extrabold text-white mb-1">{user.name}</h1>
          {student && (
            <p className="text-sky-200 text-sm">
              {student.class_name || 'Student'} · Roll #{student.roll_number || '—'}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 -mt-12 pb-12 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={CheckCircle2}  label="Attendance"    value={attendancePct !== null ? `${attendancePct}%` : '—'} sub={`${presentDays}/${totalDays} days`} color="#10b981" />
          <StatCard icon={Banknote}      label="Due Balance"   value={`PKR ${PKR(totalDue)}`} sub={`${unpaidInvoices.length} invoices`} color="#ef4444" />
          <StatCard icon={NotebookPen}   label="Homework"      value={activeHomework.length}  sub="pending review" color="#8b5cf6" />
          <StatCard icon={FileBarChart2} label="Upcoming Exams" value={upcomingExams.length}  sub="scheduled" color="#f59e0b" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Fee invoices */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Banknote size={16} className="text-red-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Fee Status</h2>
            </div>
            {invoices.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No invoices found</p>
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
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Homework */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <NotebookPen size={16} className="text-purple-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Recent Homework</h2>
            </div>
            {homework.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No homework found</p>
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
                      {overdue && (
                        <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                      )}
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
              {/* Progress bar */}
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
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  Total days: {totalDays}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
