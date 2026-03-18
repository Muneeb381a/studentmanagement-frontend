import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import {
  School, CalendarDays, Plus, CheckCircle2, Trash2, X,
  DatabaseBackup, Download, Upload, AlertTriangle, ShieldCheck,
  ImagePlus, Trash,
} from 'lucide-react';
import {
  getSettings, saveSettings,
  getAcademicYears, createAcademicYear, setActiveYear, deleteAcademicYear,
  uploadLogo, deleteLogo,
} from '../api/settings';
import { downloadBackup, restoreBackup } from '../api/backup';

const TABS = [
  { id: 'school',   label: 'School Info',      icon: School },
  { id: 'academic', label: 'Academic Years',   icon: CalendarDays },
  { id: 'backup',   label: 'Backup & Restore', icon: DatabaseBackup },
];

/* ─── Shared style helpers ─────────────────────────────────────── */
function useStyles(dark) {
  return {
    page:    `min-h-screen p-6 ${dark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`,
    card:    `rounded-2xl border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`,
    card2:   `rounded-2xl border p-5 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`,
    inp:     `w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition
              ${dark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800'}`,
    lbl:     `block text-xs font-semibold mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-600'}`,
    section: `text-xs font-bold uppercase tracking-wider mb-4 ${dark ? 'text-slate-400' : 'text-slate-400'}`,
    muted:   `text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`,
  };
}

/* ─── School Info + Logo Tab ───────────────────────────────────── */
function SchoolSettingsTab({ dark }) {
  const s = useStyles(dark);
  const [form, setForm] = useState({
    school_name: '', school_address: '', school_phone: '',
    school_email: '', school_motto: '', currency: 'PKR',
    bank_name: '', bank_account_title: '', bank_account_no: '',
    bank_iban: '', bank_branch: '', bank_branch_code: '',
  });
  const [logoUrl,      setLogoUrl]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoRef = useRef(null);

  useEffect(() => {
    getSettings()
      .then(r => {
        const d = r.data?.data ?? r.data;
        setForm(f => ({ ...f, ...d }));
        if (d.school_logo) setLogoUrl(d.school_logo);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(form);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await uploadLogo(file);
      const url = res.data?.data?.url;
      setLogoUrl(url);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleLogoDelete = async () => {
    try {
      await deleteLogo();
      setLogoUrl(null);
      toast.success('Logo removed');
    } catch { toast.error('Failed to remove logo'); }
  };

  if (loading) return (
    <div className="py-20 text-center">
      <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">

      {/* Logo */}
      <div>
        <p className={s.section}>School Logo</p>
        <div className="flex items-center gap-5">
          {/* Preview */}
          <div className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0
            ${dark ? 'border-slate-600 bg-slate-700/50' : 'border-slate-300 bg-slate-50'}`}>
            {logoUrl
              ? <img src={logoUrl} alt="School logo" className="w-full h-full object-contain p-1" />
              : <ImagePlus size={28} className={dark ? 'text-slate-500' : 'text-slate-300'} />
            }
          </div>
          {/* Controls */}
          <div className="space-y-2">
            <p className={s.muted}>PNG or JPG, max 5 MB. Displayed on printed documents and receipts.</p>
            <div className="flex gap-2">
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                disabled={uploadingLogo}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-60
                  ${dark ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                <Upload size={13} />
                {uploadingLogo ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={handleLogoDelete}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition
                    ${dark ? 'bg-red-900/40 hover:bg-red-900/70 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'}`}
                >
                  <Trash size={13} /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className={`border-t ${dark ? 'border-slate-700' : 'border-slate-200'}`} />

      {/* School details */}
      <div>
        <p className={s.section}>School Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={s.lbl}>School Name</label>
            <input className={s.inp} value={form.school_name || ''} onChange={e => set('school_name', e.target.value)} placeholder="e.g. Bright Future School" />
          </div>
          <div className="sm:col-span-2">
            <label className={s.lbl}>School Address</label>
            <textarea rows={2} className={s.inp} value={form.school_address || ''} onChange={e => set('school_address', e.target.value)} placeholder="Full address" />
          </div>
          <div>
            <label className={s.lbl}>Phone Number</label>
            <input className={s.inp} value={form.school_phone || ''} onChange={e => set('school_phone', e.target.value)} placeholder="+92 300 0000000" />
          </div>
          <div>
            <label className={s.lbl}>Email Address</label>
            <input type="email" className={s.inp} value={form.school_email || ''} onChange={e => set('school_email', e.target.value)} placeholder="school@example.com" />
          </div>
          <div className="sm:col-span-2">
            <label className={s.lbl}>School Motto / Tagline</label>
            <input className={s.inp} value={form.school_motto || ''} onChange={e => set('school_motto', e.target.value)} placeholder="e.g. Excellence in Education" />
          </div>
          <div>
            <label className={s.lbl}>Currency</label>
            <select className={s.inp} value={form.currency || 'PKR'} onChange={e => set('currency', e.target.value)}>
              <option value="PKR">PKR — Pakistani Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="AED">AED — UAE Dirham</option>
              <option value="SAR">SAR — Saudi Riyal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className={`border-t ${dark ? 'border-slate-700' : 'border-slate-200'}`} />

      {/* Bank Details */}
      <div>
        <p className={s.section}>Bank / Challan Details</p>
        <p className={`${s.muted} mb-4`}>Used on fee challans printed for parents. Leave blank if not applicable.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={s.lbl}>Bank Name</label>
            <input className={s.inp} value={form.bank_name || ''} onChange={e => set('bank_name', e.target.value)} placeholder="e.g. Habib Bank Limited (HBL)" />
          </div>
          <div className="sm:col-span-2">
            <label className={s.lbl}>Account Title</label>
            <input className={s.inp} value={form.bank_account_title || ''} onChange={e => set('bank_account_title', e.target.value)} placeholder="e.g. Bright Future School Fund" />
          </div>
          <div>
            <label className={s.lbl}>Account Number</label>
            <input className={s.inp} value={form.bank_account_no || ''} onChange={e => set('bank_account_no', e.target.value)} placeholder="e.g. 0123-4567890-001" />
          </div>
          <div>
            <label className={s.lbl}>IBAN</label>
            <input className={s.inp} value={form.bank_iban || ''} onChange={e => set('bank_iban', e.target.value)} placeholder="e.g. PK36HABB0000000123456702" />
          </div>
          <div>
            <label className={s.lbl}>Branch Name</label>
            <input className={s.inp} value={form.bank_branch || ''} onChange={e => set('bank_branch', e.target.value)} placeholder="e.g. Main Branch, Gulberg" />
          </div>
          <div>
            <label className={s.lbl}>Branch Code</label>
            <input className={s.inp} value={form.bank_branch_code || ''} onChange={e => set('bank_branch_code', e.target.value)} placeholder="e.g. 0425" />
          </div>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}

/* ─── Academic Years Tab ───────────────────────────────────────── */
function AcademicYearsTab({ dark }) {
  const s = useStyles(dark);
  const [years,   setYears]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ label: '', start_date: '', end_date: '' });
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getAcademicYears()
      .then(r => { const d = r.data?.data ?? r.data; setYears(Array.isArray(d) ? d : []); })
      .catch(() => toast.error('Failed to load academic years'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.label || !form.start_date || !form.end_date) return toast.error('All fields required');
    setSaving(true);
    try {
      await createAcademicYear(form);
      toast.success('Academic year added');
      setShowAdd(false);
      setForm({ label: '', start_date: '', end_date: '' });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add academic year');
    } finally { setSaving(false); }
  };

  const handleActivate = async (id, label) => {
    try { await setActiveYear(id); toast.success(`${label} is now the active year`); load(); }
    catch { toast.error('Failed to set active year'); }
  };

  const handleDelete = async (id) => {
    try { await deleteAcademicYear(id); toast.success('Academic year deleted'); load(); }
    catch (err) { toast.error(err?.response?.data?.message || 'Cannot delete active year'); }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <p className={s.muted}>Manage academic years. Only one year can be active at a time.</p>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
        >
          {showAdd ? <X size={14} /> : <Plus size={14} />}
          {showAdd ? 'Cancel' : 'Add Year'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className={`mb-5 p-5 rounded-2xl border ${dark ? 'bg-slate-700/50 border-slate-600' : 'bg-indigo-50 border-indigo-200'}`}>
          <h3 className={`text-sm font-bold mb-4 ${dark ? 'text-white' : 'text-slate-800'}`}>New Academic Year</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={s.lbl}>Label</label>
              <input className={s.inp} value={form.label} onChange={e => setForm(f => ({...f, label: e.target.value}))} placeholder="e.g. 2025-2026" />
            </div>
            <div>
              <label className={s.lbl}>Start Date</label>
              <input type="date" className={s.inp} value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} />
            </div>
            <div>
              <label className={s.lbl}>End Date</label>
              <input type="date" className={s.inp} value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} />
            </div>
          </div>
          <button type="submit" disabled={saving} className="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {saving ? 'Adding…' : 'Add Academic Year'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="py-12 text-center"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : years.length === 0 ? (
        <div className={`py-12 text-center rounded-2xl border-2 border-dashed ${dark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
          <CalendarDays size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No academic years defined yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {years.map(yr => (
            <div
              key={yr.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition ${yr.is_active
                ? dark ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-300'
                : dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className={`p-2 rounded-xl ${yr.is_active
                ? dark ? 'bg-emerald-900/40' : 'bg-emerald-100'
                : dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <CalendarDays size={18} className={yr.is_active
                  ? dark ? 'text-emerald-400' : 'text-emerald-600'
                  : dark ? 'text-slate-400' : 'text-slate-500'} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>{yr.label}</span>
                  {yr.is_active && (
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${dark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      <CheckCircle2 size={11} /> Active
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {new Date(yr.start_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' — '}
                  {new Date(yr.end_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!yr.is_active && (
                  <button
                    onClick={() => handleActivate(yr.id, yr.label)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
                  >
                    Set Active
                  </button>
                )}
                {!yr.is_active && (
                  <button
                    onClick={() => handleDelete(yr.id)}
                    className={`p-1.5 rounded-lg transition ${dark ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Backup & Restore Tab ─────────────────────────────────────── */
function BackupTab({ dark }) {
  const s = useStyles(dark);
  const [downloading, setDownloading] = useState(false);
  const [restoring,   setRestoring]   = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [fileInfo,    setFileInfo]    = useState(null);
  const fileRef = useRef(null);

  const btnBase = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';

  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadBackup(); toast.success('Backup downloaded'); }
    catch (err) { toast.error(err?.response?.data?.message ?? 'Download failed'); }
    finally { setDownloading(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.tables || data.app !== 'SchoolMS') {
          toast.error('Invalid backup — not a SchoolMS backup file'); return;
        }
        const totalRows = Object.values(data.tables).reduce((sum, r) => sum + r.length, 0);
        setPendingFile(data);
        setFileInfo({ name: file.name, exportedAt: data.exported_at, exportedBy: data.exported_by, totalRows });
        setConfirmOpen(true);
      } catch { toast.error('Could not parse backup file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestore = async () => {
    if (!pendingFile) return;
    setRestoring(true); setConfirmOpen(false);
    try {
      const res = await restoreBackup(pendingFile);
      toast.success(res.message ?? 'Restore complete');
      setPendingFile(null); setFileInfo(null);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Restore failed');
    } finally { setRestoring(false); }
  };

  return (
    <div className="max-w-2xl space-y-5">

      {/* Export */}
      <div className={s.card2}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${dark ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
            <Download size={20} className="text-indigo-500" />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold text-sm mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>Export Backup</h3>
            <p className={`text-xs mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Downloads a complete JSON snapshot of all school data — students, fees, attendance, teachers, library, and more.
              Store this file safely; it can fully restore your database.
            </p>
            <button onClick={handleDownload} disabled={downloading} className={`${btnBase} bg-indigo-600 hover:bg-indigo-700 text-white`}>
              <Download size={15} />
              {downloading ? 'Preparing…' : 'Download Backup'}
            </button>
          </div>
        </div>
      </div>

      {/* Restore */}
      <div className={`rounded-2xl border p-5 ${dark ? 'bg-orange-900/10 border-orange-800/50' : 'bg-orange-50 border-orange-200'}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${dark ? 'bg-orange-900/40' : 'bg-orange-100'}`}>
            <Upload size={20} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>Restore from Backup</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${dark ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                Destructive
              </span>
            </div>
            <p className={`text-xs mb-4 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              Replaces <strong>all</strong> current data with the selected backup file. This cannot be undone.
            </p>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
            <button onClick={() => fileRef.current?.click()} disabled={restoring} className={`${btnBase} bg-orange-600 hover:bg-orange-700 text-white`}>
              <Upload size={15} />
              {restoring ? 'Restoring…' : 'Select Backup File'}
            </button>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className={`flex gap-3 p-4 rounded-xl border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
        <p className={`text-xs leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Backup files contain sensitive data (student records, fees, salary info). Store them encrypted or in a secure location. Only admins can export or restore backups.
        </p>
      </div>

      {/* Confirm restore modal */}
      {confirmOpen && fileInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h2 className={`font-bold text-base ${dark ? 'text-white' : 'text-slate-800'}`}>Confirm Restore</h2>
              </div>
              <div className={`rounded-xl p-4 mb-5 text-xs space-y-1.5 ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                <div><span className="font-semibold">File:</span> {fileInfo.name}</div>
                <div><span className="font-semibold">Exported by:</span> {fileInfo.exportedBy ?? '—'}</div>
                <div><span className="font-semibold">Exported at:</span> {fileInfo.exportedAt ? new Date(fileInfo.exportedAt).toLocaleString('en-PK') : '—'}</div>
                <div><span className="font-semibold">Total rows:</span> {fileInfo.totalRows.toLocaleString()}</div>
              </div>
              <p className={`text-sm mb-6 ${dark ? 'text-red-400' : 'text-red-600'}`}>
                This will <strong>permanently erase all current data</strong> and replace it with the backup. Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmOpen(false); setPendingFile(null); setFileInfo(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${dark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button onClick={handleRestore} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition">
                  Yes, Restore Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Settings Page ───────────────────────────────────────── */
export default function SettingsPage() {
  const { isDark: dark } = useTheme();   // ← fixed: was `dark` (undefined), now `isDark`
  const [tab, setTab] = useState('school');

  const pageBg = dark ? 'bg-slate-900' : 'bg-slate-50';
  const cardBg = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm';
  const titleColor = dark ? 'text-white' : 'text-slate-800';
  const subColor   = dark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen p-6 ${pageBg}`}>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${titleColor}`}>Settings</h1>
        <p className={`text-sm mt-0.5 ${subColor}`}>School configuration, academic years & data backup</p>
      </div>

      <div className="flex gap-6 items-start">

        {/* Sidebar navigation */}
        <div className="w-52 shrink-0">
          <nav className={`rounded-2xl border p-2 space-y-1 ${cardBg}`}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition text-left ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : dark
                        ? 'text-slate-300 hover:bg-slate-700/80 hover:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-white' : dark ? 'text-slate-400' : 'text-slate-500'} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className={`flex-1 rounded-2xl border p-6 ${cardBg}`}>
          {tab === 'school'   && <SchoolSettingsTab dark={dark} />}
          {tab === 'academic' && <AcademicYearsTab dark={dark} />}
          {tab === 'backup'   && <BackupTab dark={dark} />}
        </div>

      </div>
    </div>
  );
}
