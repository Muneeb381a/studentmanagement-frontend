import { useEffect, useState } from 'react';
import {
  CalendarDays, NotebookPen, FileBarChart2, Clock,
  BookOpen, Users, CheckCircle2, AlertCircle,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { getTimetable } from '../api/timetable';
import { getHomework } from '../api/homework';
import { getExams } from '../api/exams';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
          <Icon size={18} style={{ color }} />
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{value ?? '—'}</p>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [homework,  setHomework]  = useState([]);
  const [exams,     setExams]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  const todayName = DAYS[new Date().getDay()];

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ttRes, hwRes, exRes] = await Promise.all([
          user.entity_id
            ? getTimetable({ teacher_id: user.entity_id })
            : Promise.resolve({ data: [] }),
          user.entity_id
            ? getHomework({ teacher_id: user.entity_id, limit: 10 })
            : Promise.resolve({ data: [] }),
          getExams({ limit: 5 }),
        ]);
        setTimetable(Array.isArray(ttRes.data) ? ttRes.data : []);
        setHomework(Array.isArray(hwRes.data) ? hwRes.data : []);
        setExams(Array.isArray(exRes.data) ? exRes.data : []);
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchAll();
  }, [user.entity_id]);

  const todayPeriods = timetable.filter(p => p.day_of_week === todayName);
  const pendingHw    = homework.filter(h => h.status !== 'graded');
  const upcomingExams = exams.filter(e => e.status === 'scheduled').slice(0, 3);

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 pt-10 pb-20"
        style={{ background: 'linear-gradient(135deg, #312e81, #1e1b4b)' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #818cf8 0%, transparent 60%)' }} />
        <div className="relative max-w-3xl">
          <p className="text-indigo-300 text-sm font-semibold mb-1">{greeting()}</p>
          <h1 className="text-3xl font-extrabold text-white mb-1">{user.name}</h1>
          <p className="text-indigo-200 text-sm">Teacher Portal · Today is {todayName}</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 -mt-12 pb-12 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={CalendarDays}  label="Today's Periods"  value={todayPeriods.length}  color="#6366f1" />
          <StatCard icon={NotebookPen}   label="Homework Assigned" value={homework.length}      color="#8b5cf6" />
          <StatCard icon={AlertCircle}   label="Pending Review"    value={pendingHw.length}     color="#f59e0b" />
          <StatCard icon={FileBarChart2} label="Upcoming Exams"    value={upcomingExams.length} color="#10b981" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Today's timetable */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Today's Schedule</h2>
              <span className="ml-auto text-[11px] font-semibold text-slate-400">{todayName}</span>
            </div>
            {todayPeriods.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No periods today</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayPeriods.sort((a, b) => a.period_number - b.period_number).map(p => (
                  <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">P{p.period_number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{p.subject_name || '—'}</p>
                      <p className="text-[11px] text-slate-400">{p.class_name || '—'} · {p.start_time}–{p.end_time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent homework */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <NotebookPen size={16} className="text-purple-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Recent Homework</h2>
            </div>
            {homework.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No homework assigned</p>
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
                          {hw.class_name || '—'} · Due: {hw.due_date || '—'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        hw.status === 'graded'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {hw.status || 'active'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Upcoming exams */}
        {upcomingExams.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <FileBarChart2 size={16} className="text-emerald-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Upcoming Exams</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingExams.map(ex => (
                <div key={ex.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {new Date(ex.start_date).toLocaleDateString('en', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="text-sm font-extrabold text-amber-700 dark:text-amber-300 -mt-0.5">
                      {new Date(ex.start_date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{ex.title}</p>
                    <p className="text-[11px] text-slate-400">{ex.academic_year || ''}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Scheduled
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
