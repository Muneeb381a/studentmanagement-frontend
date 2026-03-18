import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ClipboardList, Plus, Pencil, Trash2, ChevronDown, Search,
  BookOpen, BarChart3, Trophy, FileText, Check, X, Calculator,
  Calendar, AlertCircle, CheckCircle2, Clock, TrendingUp, Printer,
} from 'lucide-react';
import Layout   from '../components/layout/Layout';
import Modal    from '../components/ui/Modal';
import Button   from '../components/ui/Button';
import Input    from '../components/ui/Input';
import Spinner  from '../components/ui/Spinner';
import {
  getExams, createExam, updateExam, deleteExam, updateExamStatus,
  getExamSubjects, addExamSubjects,
  getMarks, submitMarks,
  calculateResults, getResults, getStudentReportCard, getClassRanking,
} from '../api/exams';

import { getClasses }  from '../api/classes';
import { getStudents } from '../api/students';
import { getClassSubjects } from '../api/subjects';

// ─────────────────────────────────────────────────────────────
//  Constants & helpers
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'exams',   label: 'Exams',        icon: ClipboardList },
  { id: 'config',  label: 'Marks Config', icon: BookOpen },
  { id: 'marks',   label: 'Enter Marks',  icon: Pencil },
  { id: 'results', label: 'Results',      icon: BarChart3 },
];

const EXAM_TYPES = ['midterm', 'final', 'quiz', 'monthly_test', 'other'];

const STATUS_META = {
  scheduled: { label: 'Scheduled', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40', icon: Clock },
  ongoing:   { label: 'Ongoing',   cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40',   icon: AlertCircle },
  completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40', icon: CheckCircle2 },
};

const GRADE_META = {
  'A+': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'A':  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'B':  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'C':  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'D':  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'F':  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.scheduled;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${m.cls}`}>
      <Icon size={10} />
      {m.label}
    </span>
  );
}

function GradeBadge({ grade }) {
  const cls = GRADE_META[grade] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${cls}`}>
      {grade}
    </span>
  );
}

function EmptyBox({ icon: Icon = ClipboardList, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600 gap-3">
      <Icon size={36} strokeWidth={1.3} />
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}

function ClassSelect({ value, onChange, classes, label = 'Select Class', className = '' }) {
  return (
    <div className={`max-w-xs ${className}`}>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none text-sm rounded-lg border border-slate-200 dark:border-slate-700
                     bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                     px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <option value="">— Choose a class —</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.grade} {c.section})</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function ExamSelect({ value, onChange, exams, label = 'Select Exam', className = '' }) {
  return (
    <div className={`max-w-xs ${className}`}>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none text-sm rounded-lg border border-slate-200 dark:border-slate-700
                     bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                     px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <option value="">— Choose an exam —</option>
          {exams.map(e => (
            <option key={e.id} value={e.id}>{e.exam_name} ({e.academic_year})</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ExamsPage root
// ─────────────────────────────────────────────────────────────
export default function ExamsPage() {
  const [tab, setTab] = useState('exams');

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}
          >
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Exam Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Create exams, configure marks, enter results, and generate report cards</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === id
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              ].join(' ')}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {tab === 'exams'   && <ExamsTab />}
        {tab === 'config'  && <MarksConfigTab />}
        {tab === 'marks'   && <EnterMarksTab />}
        {tab === 'results' && <ResultsTab />}
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 1 — Exams CRUD
// ─────────────────────────────────────────────────────────────
function ExamsTab() {
  const [exams,      setExams]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getExams();
      setExams(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load exams');
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? All marks and results for this exam will also be deleted.`)) return;
    try {
      await deleteExam(id);
      toast.success('Exam deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateExamStatus(id, status);
      toast.success('Status updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const filtered = exams.filter(e =>
    e.exam_name.toLowerCase().includes(search.toLowerCase()) ||
    e.academic_year.includes(search)
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exams…"
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                       focus:outline-none focus:ring-2 focus:ring-orange-500/30 w-56"
          />
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}
          style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
          <Plus size={14} /> New Exam
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyBox icon={ClipboardList} message="No exams found. Create your first exam." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(exam => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onEdit={() => { setEditing(exam); setModalOpen(true); }}
              onDelete={() => handleDelete(exam.id, exam.exam_name)}
              onStatusChange={(s) => handleStatusChange(exam.id, s)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <ExamFormModal
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </>
  );
}

function ExamCard({ exam, onEdit, onDelete, onStatusChange }) {
  const typeLabel = exam.exam_type.replace('_', ' ');
  const nextStatus = { scheduled: 'ongoing', ongoing: 'completed', completed: 'scheduled' };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700
                    p-5 space-y-4 hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{exam.exam_name}</p>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{typeLabel} · {exam.academic_year}</p>
        </div>
        <StatusBadge status={exam.status} />
      </div>

      {/* Dates */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Calendar size={12} />
        <span>{new Date(exam.start_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
        {exam.start_date !== exam.end_date && (
          <>
            <span>→</span>
            <span>{new Date(exam.end_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
        {/* Status cycle button */}
        <button
          onClick={() => onStatusChange(nextStatus[exam.status])}
          className="flex-1 text-xs py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700
                     text-slate-500 dark:text-slate-400 hover:border-orange-300 hover:text-orange-600
                     dark:hover:text-orange-400 transition-colors font-medium capitalize"
        >
          → {nextStatus[exam.status]}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50
                     dark:hover:bg-indigo-900/20 transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50
                     dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function ExamFormModal({ initial, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    exam_name: '', exam_type: 'midterm', academic_year: '2024-25',
    start_date: today, end_date: today, status: 'scheduled',
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.exam_name.trim()) { toast.error('Exam name is required'); return; }
    if (form.end_date < form.start_date) { toast.error('End date must be after start date'); return; }
    setSaving(true);
    try {
      if (initial?.id) {
        await updateExam(initial.id, form);
        toast.success('Exam updated');
      } else {
        await createExam(form);
        toast.success('Exam created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial?.id ? 'Edit Exam' : 'New Exam'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="Exam Name *"
          value={form.exam_name}
          onChange={e => set('exam_name', e.target.value)}
          placeholder="e.g. Midterm Exam 2025"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Exam Type</label>
            <div className="relative">
              <select
                value={form.exam_type}
                onChange={e => set('exam_type', e.target.value)}
                className="w-full appearance-none text-sm rounded-lg border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                           px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              >
                {EXAM_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <Input
            label="Academic Year"
            value={form.academic_year}
            onChange={e => set('academic_year', e.target.value)}
            placeholder="2024-25"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date *" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          <Input label="End Date *"   type="date" value={form.end_date}   onChange={e => set('end_date',   e.target.value)} />
        </div>

        {initial?.id && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
            <div className="relative">
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full appearance-none text-sm rounded-lg border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                           px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              >
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}
            style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
            <Check size={14} /> {initial?.id ? 'Save Changes' : 'Create Exam'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 2 — Marks Config (total & passing marks per subject)
// ─────────────────────────────────────────────────────────────
function MarksConfigTab() {
  const [exams,     setExams]     = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [selExam,   setSelExam]   = useState('');
  const [selClass,  setSelClass]  = useState('');
  const [subjects,  setSubjects]  = useState([]);   // class subjects
  const [config,    setConfig]    = useState({});   // { subjectId: { total_marks, passing_marks } }
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    Promise.all([getExams(), getClasses()])
      .then(([e, c]) => {
        setExams(Array.isArray(e.data) ? e.data : []);
        setClasses(Array.isArray(c.data) ? c.data : []);
      })
      .catch(() => {});
  }, []);

  // When exam+class selected, load class subjects and any existing config
  useEffect(() => {
    if (!selExam || !selClass) { setSubjects([]); setConfig({}); return; }
    setLoading(true);
    Promise.all([
      getClassSubjects(selClass),
      getExamSubjects(selExam, { class_id: selClass }),
    ])
      .then(([cs, es]) => {
        const classSubjects = Array.isArray(cs.data) ? cs.data : [];
        const examSubjects  = Array.isArray(es.data) ? es.data : [];

        setSubjects(classSubjects);

        // Pre-fill config from existing exam_subjects
        const cfg = {};
        classSubjects.forEach(cs => {
          const existing = examSubjects.find(es => es.subject_id === cs.subject_id);
          cfg[cs.subject_id] = {
            total_marks:   existing ? existing.total_marks   : '',
            passing_marks: existing ? existing.passing_marks : '',
          };
        });
        setConfig(cfg);
      })
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => setLoading(false));
  }, [selExam, selClass]);

  const setMark = (subjectId, field, val) =>
    setConfig(c => ({ ...c, [subjectId]: { ...c[subjectId], [field]: val } }));

  const handleSave = async () => {
    const items = subjects.map(s => ({
      class_id:      Number(selClass),
      subject_id:    s.subject_id,
      total_marks:   parseFloat(config[s.subject_id]?.total_marks),
      passing_marks: parseFloat(config[s.subject_id]?.passing_marks),
    }));

    // Validate
    for (const it of items) {
      if (!it.total_marks || !it.passing_marks) {
        toast.error('Please fill in all total and passing marks'); return;
      }
      if (it.passing_marks > it.total_marks) {
        toast.error('Passing marks cannot exceed total marks'); return;
      }
    }

    setSaving(true);
    try {
      await addExamSubjects(selExam, items);
      toast.success('Marks configuration saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <ExamSelect  value={selExam}  onChange={setSelExam}  exams={exams}   label="Select Exam" />
        <ClassSelect value={selClass} onChange={setSelClass} classes={classes} label="Select Class" />
      </div>

      {(!selExam || !selClass) ? (
        <EmptyBox icon={BookOpen} message="Select an exam and class to configure subject marks." />
      ) : loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : subjects.length === 0 ? (
        <EmptyBox icon={BookOpen} message="No subjects assigned to this class. Go to Subjects → Assign to Classes first." />
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Configure marks per subject for this exam
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">Total Marks</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">Passing Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {subjects.map(s => (
                  <tr key={s.subject_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                      {s.subject_name}
                      {s.subject_code && <span className="ml-2 text-xs text-slate-400">({s.subject_code})</span>}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number" min="1" max="1000"
                        value={config[s.subject_id]?.total_marks || ''}
                        onChange={e => setMark(s.subject_id, 'total_marks', e.target.value)}
                        placeholder="e.g. 100"
                        className="w-32 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                                   bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                                   px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number" min="1" max="1000"
                        value={config[s.subject_id]?.passing_marks || ''}
                        onChange={e => setMark(s.subject_id, 'passing_marks', e.target.value)}
                        placeholder="e.g. 40"
                        className="w-32 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                                   bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                                   px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button loading={saving} onClick={handleSave}
              style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
              <Check size={14} /> Save Configuration
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 3 — Enter Marks
// ─────────────────────────────────────────────────────────────
function EnterMarksTab() {
  const [exams,     setExams]     = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [selExam,   setSelExam]   = useState('');
  const [selClass,  setSelClass]  = useState('');
  const [subjects,  setSubjects]  = useState([]);   // exam_subjects for this exam+class
  const [students,  setStudents]  = useState([]);
  const [marks,     setMarks]     = useState({});   // marks[studentId][subjectId] = value
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    Promise.all([getExams(), getClasses()])
      .then(([e, c]) => {
        setExams(Array.isArray(e.data) ? e.data : []);
        setClasses(Array.isArray(c.data) ? c.data : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selExam || !selClass) { setSubjects([]); setStudents([]); setMarks({}); return; }
    setLoading(true);
    Promise.all([
      getExamSubjects(selExam, { class_id: selClass }),
      getStudents({ class_id: selClass }),
      getMarks(selExam, { class_id: selClass }),
    ])
      .then(([es, st, mk]) => {
        const examSubs = Array.isArray(es.data) ? es.data : [];
        const studs    = Array.isArray(st.data) ? st.data : [];
        const existing = Array.isArray(mk.data) ? mk.data : [];

        setSubjects(examSubs);
        setStudents(studs);

        // Pre-fill marks grid
        const grid = {};
        studs.forEach(s => {
          grid[s.id] = {};
          examSubs.forEach(sub => {
            const found = existing.find(m => m.student_id === s.id && m.subject_id === sub.subject_id);
            grid[s.id][sub.subject_id] = found ? String(found.obtained_marks) : '';
          });
        });
        setMarks(grid);
      })
      .catch(() => toast.error('Failed to load marks data'))
      .finally(() => setLoading(false));
  }, [selExam, selClass]);

  const setMark = (studentId, subjectId, val) =>
    setMarks(m => ({ ...m, [studentId]: { ...m[studentId], [subjectId]: val } }));

  const handleSubmit = async () => {
    const marksArr = [];
    for (const student of students) {
      for (const sub of subjects) {
        const val = marks[student.id]?.[sub.subject_id];
        if (val === '' || val == null) continue;
        const num = parseFloat(val);
        if (isNaN(num)) { toast.error(`Invalid marks for ${student.full_name}`); return; }
        if (num > parseFloat(sub.total_marks)) {
          toast.error(`${student.full_name}: marks for ${sub.subject_name} exceed total (${sub.total_marks})`);
          return;
        }
        marksArr.push({
          student_id:     student.id,
          subject_id:     sub.subject_id,
          class_id:       Number(selClass),
          obtained_marks: num,
        });
      }
    }

    if (marksArr.length === 0) { toast.error('No marks to save'); return; }

    setSaving(true);
    try {
      await submitMarks(selExam, marksArr);
      toast.success(`${marksArr.length} mark(s) saved successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <ExamSelect  value={selExam}  onChange={setSelExam}  exams={exams}    label="Select Exam" />
        <ClassSelect value={selClass} onChange={setSelClass} classes={classes} label="Select Class" />
      </div>

      {(!selExam || !selClass) ? (
        <EmptyBox icon={Pencil} message="Select an exam and class to enter student marks." />
      ) : loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : subjects.length === 0 ? (
        <EmptyBox icon={BookOpen} message="No subjects configured for this exam and class. Go to Marks Config first." />
      ) : students.length === 0 ? (
        <EmptyBox icon={BookOpen} message="No students found in this class." />
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {students.length} Students · {subjects.length} Subjects
              </p>
              <p className="text-xs text-slate-400">Leave blank to skip a subject</p>
            </div>
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide sticky left-0 bg-slate-50 dark:bg-slate-800/80 z-10 min-w-[160px]">
                    Student
                  </th>
                  {subjects.map(s => (
                    <th key={s.subject_id} className="px-3 py-3 text-center min-w-[110px]">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.subject_name}</p>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">/ {s.total_marks} (pass {s.passing_marks})</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-slate-800 z-10">
                      <p className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate max-w-[150px]">
                        {student.full_name}
                      </p>
                      {student.roll_number && (
                        <p className="text-xs text-slate-400">Roll: {student.roll_number}</p>
                      )}
                    </td>
                    {subjects.map(sub => {
                      const val = marks[student.id]?.[sub.subject_id] ?? '';
                      const num = parseFloat(val);
                      const isOver  = val !== '' && !isNaN(num) && num > parseFloat(sub.total_marks);
                      const isFail  = val !== '' && !isNaN(num) && num < parseFloat(sub.passing_marks);
                      return (
                        <td key={sub.subject_id} className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max={sub.total_marks}
                            step="0.5"
                            value={val}
                            onChange={e => setMark(student.id, sub.subject_id, e.target.value)}
                            className={[
                              'w-20 text-center text-sm rounded-lg border px-2 py-1.5',
                              'focus:outline-none focus:ring-2 focus:ring-orange-500/30',
                              'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200',
                              isOver
                                ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                                : isFail
                                ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                                : 'border-slate-200 dark:border-slate-700',
                            ].join(' ')}
                            placeholder="–"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-slate-400">
              <span className="inline-block w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30 mr-1 align-middle" />Below passing ·
              <span className="inline-block w-3 h-3 rounded bg-red-100 dark:bg-red-900/20 ml-2 mr-1 align-middle" />Exceeds total
            </p>
            <Button loading={saving} onClick={handleSubmit}
              style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
              <Check size={14} /> Save All Marks
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 4 — Results
// ─────────────────────────────────────────────────────────────
function ResultsTab() {
  const [exams,        setExams]        = useState([]);
  const [classes,      setClasses]      = useState([]);
  const [selExam,      setSelExam]      = useState('');
  const [selClass,     setSelClass]     = useState('');
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [calculating,  setCalculating]  = useState(false);
  const [reportCard,   setReportCard]   = useState(null);   // { summary, subjects }
  const [reportOpen,   setReportOpen]   = useState(false);

  useEffect(() => {
    Promise.all([getExams(), getClasses()])
      .then(([e, c]) => {
        setExams(Array.isArray(e.data) ? e.data : []);
        setClasses(Array.isArray(c.data) ? c.data : []);
      })
      .catch(() => {});
  }, []);

  const loadResults = useCallback(async () => {
    if (!selExam || !selClass) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await getClassRanking(selExam, selClass);
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [selExam, selClass]);

  useEffect(() => { loadResults(); }, [loadResults]);

  const handleCalculate = async () => {
    if (!selExam) { toast.error('Select an exam first'); return; }
    setCalculating(true);
    try {
      const { data } = await calculateResults(selExam);
      const count = Array.isArray(data) ? data.length : 0;
      toast.success(`Results calculated for ${count} student(s)`);
      loadResults();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const openReportCard = async (studentId) => {
    try {
      const res = await getStudentReportCard(selExam, studentId);
      // axios interceptor doesn't unwrap object data, so access res.data.data
      const payload = res.data?.data ?? res.data;
      setReportCard(payload);
      setReportOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load report card');
    }
  };

  const passCount = results.filter(r => r.result_status === 'pass').length;
  const failCount = results.filter(r => r.result_status === 'fail').length;

  return (
    <div className="space-y-5">
      {/* Selectors + Calculate */}
      <div className="flex flex-wrap items-end gap-4">
        <ExamSelect  value={selExam}  onChange={setSelExam}  exams={exams}    label="Select Exam" />
        <ClassSelect value={selClass} onChange={setSelClass} classes={classes} label="Select Class" />
        <Button loading={calculating} onClick={handleCalculate}
          style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
          <Calculator size={14} /> Calculate Results
        </Button>
        {results.length > 0 && selExam && selClass && (
          <Button
            onClick={() => {
              const p = new URLSearchParams({ type: 'class', exam_id: selExam, class_id: selClass });
              window.open(`/exams/report-card/print?${p}`, '_blank');
            }}
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <Printer size={14} /> Print All Report Cards
          </Button>
        )}
      </div>

      {(!selExam || !selClass) ? (
        <EmptyBox icon={BarChart3} message="Select an exam and class to view results." />
      ) : loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : results.length === 0 ? (
        <EmptyBox icon={TrendingUp} message="No results yet. Enter marks and click Calculate Results." />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Students', value: results.length,   color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
              { label: 'Passed',         value: passCount,         color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'Failed',         value: failCount,         color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20' },
              { label: 'Pass Rate',      value: results.length ? `${Math.round(passCount/results.length*100)}%` : '0%', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-4`}>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Ranking table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Trophy size={14} className="text-amber-500" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Class Ranking</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {['Rank','Student','Total Marks','Obtained','Percentage','Grade','Subjects Failed','Status',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {results.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={[
                        'inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold',
                        r.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        r.rank === 2 ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                        r.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                        'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                      ].join(' ')}>
                        {r.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{r.full_name}</p>
                      {r.roll_number && <p className="text-xs text-slate-400">Roll: {r.roll_number}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.total_marks}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.obtained_marks}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{r.percentage}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <GradeBadge grade={r.grade} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.subjects_failed > 0 ? (
                        <span className="text-red-500 font-semibold">{r.subjects_failed}</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize',
                        r.result_status === 'pass'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40'
                          : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
                      ].join(' ')}>
                        {r.result_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openReportCard(r.student_id)}
                        className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400
                                   hover:underline font-medium whitespace-nowrap"
                      >
                        <FileText size={12} /> Report Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {reportOpen && reportCard && (
        <ReportCardModal
          data={reportCard}
          onClose={() => { setReportOpen(false); setReportCard(null); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Report Card Modal
// ─────────────────────────────────────────────────────────────
function ReportCardModal({ data, onClose }) {
  const { summary, subjects = [] } = data;

  return (
    <Modal isOpen onClose={onClose} title="Student Report Card" size="lg">
      <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
        {/* Student info */}
        {summary && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">{summary.full_name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {summary.class_name} · {summary.grade} {summary.section}
                  {summary.roll_number && ` · Roll: ${summary.roll_number}`}
                </p>
                {summary.father_name && (
                  <p className="text-xs text-slate-400 mt-0.5">Father: {summary.father_name}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{summary.exam_name}</p>
                <p className="text-xs text-slate-400">{summary.academic_year}</p>
                <div className="flex items-center gap-2 mt-2 justify-end">
                  <GradeBadge grade={summary.grade} />
                  <span className={[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize',
                    summary.result_status === 'pass'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40'
                      : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
                  ].join(' ')}>
                    {summary.result_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Overall marks bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Overall: {summary.obtained_marks} / {summary.total_marks}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{summary.percentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(summary.percentage, 100)}%`,
                    background: summary.percentage >= 80 ? 'linear-gradient(90deg,#10b981,#14b8a6)'
                               : summary.percentage >= 50 ? 'linear-gradient(90deg,#f59e0b,#f97316)'
                               : 'linear-gradient(90deg,#ef4444,#f97316)',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Subject-wise table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                {['Subject', 'Total', 'Passing', 'Obtained', '%', 'Grade', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {subjects.map((s, i) => (
                <tr key={i} className={s.subject_status === 'fail' ? 'bg-red-50/40 dark:bg-red-900/10' : ''}>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                    {s.subject_name}
                    {s.subject_code && <span className="ml-1 text-xs text-slate-400">({s.subject_code})</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s.total_marks}</td>
                  <td className="px-4 py-3 text-slate-500">{s.passing_marks}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{s.obtained_marks}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.subject_percentage}%</td>
                  <td className="px-4 py-3">
                    <GradeBadge grade={s.subject_grade} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize',
                      s.subject_status === 'pass'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40'
                        : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
                    ].join(' ')}>
                      {s.subject_status === 'pass' ? <Check size={9} className="mr-0.5" /> : <X size={9} className="mr-0.5" />}
                      {s.subject_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {subjects.some(s => s.remarks) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Remarks</p>
            {subjects.filter(s => s.remarks).map((s, i) => (
              <p key={i} className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">{s.subject_name}:</span> {s.remarks}
              </p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (summary?.exam_id && summary?.student_id) {
                const p = new URLSearchParams({ type: 'single', exam_id: summary.exam_id, student_id: summary.student_id });
                window.open(`/exams/report-card/print?${p}`, '_blank');
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <Printer size={13} /> Print Report Card
          </button>
          <Button variant="ghost" onClick={onClose}><X size={14} /> Close</Button>
        </div>
      </div>
    </Modal>
  );
}
