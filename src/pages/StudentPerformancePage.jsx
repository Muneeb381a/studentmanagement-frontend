import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Award, BookOpen, BarChart2, User } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { getStudentPerformance } from '../api/exams';

// ── Helpers ──────────────────────────────────────────────────
const GRADE_COLOR = { 'A+': '#10b981', A: '#34d399', B: '#6366f1', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
const TYPE_LABEL  = { midterm: 'Midterm', final: 'Final', quiz: 'Quiz', monthly_test: 'Monthly', other: 'Other' };

function gradeColor(g)  { return GRADE_COLOR[g] || '#94a3b8'; }
function pctColor(pct)  {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#6366f1';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

// ── Mini bar (single cell in trend table) ────────────────────
function MiniBar({ pct, passing }) {
  const passingPct = passing * 100 / 100; // already percentage form
  const color = pct >= passing ? '#6366f1' : '#ef4444';
  return (
    <div className="flex items-end gap-1.5">
      <div className="relative w-20 h-5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
        <div
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
          className="absolute inset-y-0 left-0 rounded transition-all"
        />
        {/* passing line */}
        <div
          style={{ left: `${Math.min(passing, 100)}%` }}
          className="absolute inset-y-0 w-px bg-slate-400/60 dark:bg-slate-500/60"
          title={`Pass: ${passing}%`}
        />
      </div>
      <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

// ── Overall progress bar ─────────────────────────────────────
function PctBar({ pct }) {
  const color = pctColor(pct);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div style={{ width: `${Math.min(pct, 100)}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────
function StatPill({ label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-5 py-4 space-y-0.5">
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function StudentPerformancePage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    getStudentPerformance(id)
      .then(r => {
        const d = r.data?.data ?? r.data;
        setData(d);
      })
      .catch(e => setError(e?.response?.data?.message || 'Failed to load performance data'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><PageLoader /></Layout>;

  if (error) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <p className="text-red-500 font-semibold">{error}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-indigo-600 hover:underline">Go back</button>
      </div>
    </Layout>
  );

  const { student, results, subjects } = data;

  // Derived stats
  const totalExams    = results.length;
  const passCount     = results.filter(r => r.result_status === 'pass').length;
  const avgPct        = totalExams > 0
    ? results.reduce((s, r) => s + parseFloat(r.percentage || 0), 0) / totalExams
    : null;
  const bestResult    = results.reduce((b, r) => (!b || parseFloat(r.percentage) > parseFloat(b.percentage)) ? r : b, null);
  const bestRank      = results.reduce((b, r) => (!b || parseInt(r.rank) < parseInt(b.rank)) ? r : b, null);

  // All exam labels in order (for trend header)
  const examLabels = results.map(r => ({ id: r.exam_id, name: r.exam_name, type: r.exam_type }));

  const cardCls = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm';
  const thCls   = 'px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.08em] whitespace-nowrap';
  const tdCls   = 'px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap';

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-2 text-indigo-200 hover:text-white text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Students
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
              <TrendingUp size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">{student.full_name}</h1>
              <p className="text-indigo-200 text-sm mt-0.5">
                {student.class_name && <span className="font-semibold">{student.class_name} · </span>}
                Roll #{student.roll_number || '—'}
                {student.father_name && <span className="ml-2 opacity-70">/ {student.father_name}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-12 pb-12 max-w-6xl mx-auto space-y-6">

        {/* ── KPI pills ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill label="Exams Taken"  value={totalExams}  sub="Total recorded" color="#6366f1" />
          <StatPill
            label="Pass Rate"
            value={totalExams ? `${Math.round((passCount / totalExams) * 100)}%` : '—'}
            sub={`${passCount} / ${totalExams} passed`}
            color={passCount === totalExams ? '#10b981' : '#f59e0b'}
          />
          <StatPill
            label="Avg Score"
            value={avgPct !== null ? `${avgPct.toFixed(1)}%` : '—'}
            sub={avgPct !== null ? `Grade ${bestResult?.grade || '—'}` : 'No results yet'}
            color={avgPct !== null ? pctColor(avgPct) : '#94a3b8'}
          />
          <StatPill
            label="Best Rank"
            value={bestRank ? `#${bestRank.rank}` : '—'}
            sub={bestRank ? `of ${bestRank.total_in_class} in ${bestRank.exam_name}` : 'No rankings yet'}
            color="#f59e0b"
          />
        </div>

        {/* ── No data state ── */}
        {totalExams === 0 && (
          <div className={`${cardCls} flex flex-col items-center justify-center py-20 gap-3`}>
            <BarChart2 size={40} className="text-slate-300 dark:text-slate-700" />
            <p className="text-slate-500 font-semibold">No exam results found for this student.</p>
            <p className="text-xs text-slate-400">Results will appear here once exams are calculated.</p>
          </div>
        )}

        {totalExams > 0 && (
          <>
            {/* ── All Exam Results table ── */}
            <div className={cardCls}>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Award size={16} className="text-indigo-500" />
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Exam Results</h2>
                <span className="ml-auto text-xs text-slate-400 font-medium">{totalExams} exam{totalExams !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                      {['Exam', 'Type', 'Year', 'Marks', 'Percentage', 'Grade', 'Rank', 'Status'].map(h => (
                        <th key={h} className={thCls}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {results.map(r => (
                      <tr key={r.exam_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                        <td className={tdCls}>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{r.exam_name}</p>
                          <p className="text-xs text-slate-400">{r.start_date?.slice(0, 10)}</p>
                        </td>
                        <td className={tdCls}>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {TYPE_LABEL[r.exam_type] || r.exam_type}
                          </span>
                        </td>
                        <td className={`${tdCls} text-slate-500`}>{r.academic_year}</td>
                        <td className={tdCls}>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{parseFloat(r.obtained_marks).toFixed(0)}</span>
                          <span className="text-slate-400"> / {parseFloat(r.total_marks).toFixed(0)}</span>
                        </td>
                        <td className={`${tdCls} min-w-40`}>
                          <PctBar pct={parseFloat(r.percentage)} />
                        </td>
                        <td className={tdCls}>
                          <span
                            className="inline-flex w-9 h-9 items-center justify-center rounded-xl text-white text-xs font-black"
                            style={{ background: gradeColor(r.grade) }}
                          >
                            {r.grade}
                          </span>
                        </td>
                        <td className={tdCls}>
                          <span className="font-bold text-amber-500">#{r.rank}</span>
                          <span className="text-xs text-slate-400"> / {r.total_in_class}</span>
                        </td>
                        <td className={tdCls}>
                          <span className={[
                            'px-2.5 py-1 rounded-lg text-xs font-bold',
                            r.result_status === 'pass'
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                          ].join(' ')}>
                            {r.result_status === 'pass' ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Subject-wise Trend ── */}
            {subjects.length > 0 && (
              <div className={cardCls}>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <BookOpen size={16} className="text-purple-500" />
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Subject-wise Performance Trend</h2>
                  <span className="ml-auto text-xs text-slate-400 font-medium">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                        <th className={`${thCls} min-w-36`}>Subject</th>
                        {examLabels.map(e => (
                          <th key={e.id} className={`${thCls} min-w-32`}>
                            <span className="block truncate max-w-28">{e.name}</span>
                            <span className="font-normal text-slate-300 dark:text-slate-700 normal-case tracking-normal">
                              {TYPE_LABEL[e.type] || e.type}
                            </span>
                          </th>
                        ))}
                        <th className={`${thCls} min-w-28`}>Average</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {subjects.map(sub => {
                        // Build a map exam_id → mark entry for this subject
                        const marksByExam = {};
                        sub.exams.forEach(e => { marksByExam[e.exam_id] = e; });

                        const subjectPcts = sub.exams.map(e => e.subject_percentage).filter(p => !isNaN(p));
                        const subAvg = subjectPcts.length > 0
                          ? subjectPcts.reduce((s, p) => s + p, 0) / subjectPcts.length
                          : null;

                        // trend direction (last vs first if 2+ exams)
                        const trend = subjectPcts.length >= 2
                          ? subjectPcts[subjectPcts.length - 1] - subjectPcts[0]
                          : null;

                        return (
                          <tr key={sub.subject_name} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                            <td className={`${tdCls} font-semibold text-slate-800 dark:text-slate-200`}>
                              <div>
                                {sub.subject_name}
                                {sub.subject_code && (
                                  <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                    {sub.subject_code}
                                  </span>
                                )}
                              </div>
                              {trend !== null && (
                                <div className={`text-[10px] font-bold mt-0.5 ${trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                  {trend > 0 ? '▲' : trend < 0 ? '▼' : '—'} {Math.abs(trend).toFixed(0)}%
                                </div>
                              )}
                            </td>
                            {examLabels.map(e => {
                              const m = marksByExam[e.id];
                              return (
                                <td key={e.id} className={`${tdCls}`}>
                                  {m ? (
                                    <MiniBar pct={m.subject_percentage} passing={Math.round((m.passing_marks / m.total_marks) * 100)} />
                                  ) : (
                                    <span className="text-xs text-slate-300 dark:text-slate-700">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className={tdCls}>
                              {subAvg !== null ? (
                                <span className="font-bold text-sm" style={{ color: pctColor(subAvg) }}>
                                  {subAvg.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" /> Passed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-red-400" /> Failed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-px h-3 bg-slate-400" /> Pass threshold
                  </span>
                  <span className="ml-auto text-slate-300 dark:text-slate-700">▲▼ = trend from first to last exam</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
