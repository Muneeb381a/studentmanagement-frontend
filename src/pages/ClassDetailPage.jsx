import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, BookOpen, Mail, Phone, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { getClass, getClassStudents } from '../api/classes';
import { formatDate, toPct } from '../utils';

export default function ClassDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [cls,      setCls]      = useState(null);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([getClass(id), getClassStudents(id)])
      .then(([c, s]) => { setCls(c.data); setStudents(Array.isArray(s.data) ? s.data : []); })
      .catch(() => toast.error('Failed to load class'))
      .finally(() => setLoading(false));
  }, [id]);

  const pct = cls ? toPct(students.length, cls.capacity) : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* ── Header ── */}
        <div className="sticky top-14 lg:top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate('/classes')}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                  {cls?.name || 'Class Detail'}
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">{cls?.academic_year}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : !cls ? (
          <EmptyState icon={BookOpen} title="Class not found" description="This class may have been deleted." />
        ) : (
          <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 max-w-5xl mx-auto">

            {/* Class info card */}
            <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="px-6 py-6 text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #9333ea)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold">{cls.name}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 border border-white/20">{cls.grade}</span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 border border-white/20">Section {cls.section}</span>
                      {cls.room_number && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 border border-white/20">Room {cls.room_number}</span>}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls.status === 'active' ? 'bg-white/20 border-white/30' : 'bg-black/20 border-black/20 text-white/60'}`}>{cls.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold">{students.length}</p>
                    <p className="text-white/60 text-xs">of {cls.capacity} enrolled</p>
                    <div className="mt-2 h-1.5 w-32 bg-white/20 rounded-full overflow-hidden ml-auto">
                      <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 px-6 py-4 flex flex-wrap gap-6 text-sm">
                {cls.class_teacher && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Teacher</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{cls.class_teacher}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Academic Year</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{cls.academic_year || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Capacity</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{cls.capacity}</p>
                </div>
              </div>
            </div>

            {/* Students list */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-indigo-500" />
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                    Students <span className="text-slate-400 font-normal ml-1">({students.length})</span>
                  </h2>
                </div>
                <Button size="sm" onClick={() => navigate('/admission/new')}>
                  Add Student
                </Button>
              </div>

              {students.length === 0 ? (
                <EmptyState icon={Users} title="No students in this class" description="Add students via the enrollment form." />
              ) : (
                <>
                  {/* Mobile */}
                  <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {students.map(s => (
                      <li key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                        <Avatar name={s.full_name} id={s.id} size="lg" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{s.full_name}</p>
                          <p className="text-xs text-slate-400 truncate">{s.phone || s.email || '—'}</p>
                        </div>
                        <Badge type="status" value={s.status || 'active'}>{s.status || 'active'}</Badge>
                      </li>
                    ))}
                  </ul>

                  {/* Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                          {['Student', 'Contact', 'B-Form', 'Status', 'Admitted', ''].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.08em] whitespace-nowrap first:pl-5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {students.map(s => (
                          <tr key={s.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 pl-5">
                              <div className="flex items-center gap-3">
                                <Avatar name={s.full_name} id={s.id} />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-40">{s.full_name}</p>
                                  {s.email && (
                                    <p className="text-xs text-slate-400 truncate max-w-40 flex items-center gap-1 mt-0.5">
                                      <Mail size={10} />{s.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {s.phone
                                ? <span className="flex items-center gap-1"><Phone size={11} className="text-slate-400" />{s.phone}</span>
                                : <span className="text-slate-300 dark:text-slate-700">—</span>
                              }
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                              {s.b_form_no || <span className="text-slate-300 dark:text-slate-700">—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge type="status" value={s.status || 'active'}>{s.status || 'active'}</Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDate(s.admission_date)}</td>
                            <td className="px-4 py-3 pr-5">
                              <button
                                onClick={() => navigate(`/admission/edit/${s.id}`)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                              >
                                <Pencil size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
