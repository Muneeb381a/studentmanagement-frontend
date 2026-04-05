import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Send, Users, BarChart3, RefreshCw,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { sendBulkWhatsApp, getWhatsAppLogs, getWhatsAppStats } from '../api/whatsapp';
import { getClasses } from '../api/classes';

const TEMPLATES = [
  { id: 'fee_reminder',     label: 'Fee Reminder',         desc: 'Remind parent about upcoming/overdue fee' },
  { id: 'exam_schedule',    label: 'Exam Schedule',         desc: 'Notify parents about upcoming exams' },
  { id: 'attendance_alert', label: 'Absence Alert',         desc: 'Alert parent about student absence' },
  { id: 'result_published', label: 'Result Published',      desc: 'Notify that exam results are out' },
  { id: 'announcement',     label: 'General Announcement',  desc: 'Broadcast a custom school announcement' },
];

const STATUS_CONFIG = {
  sent:    { icon: CheckCircle2, color: 'text-emerald-500', label: 'Sent' },
  failed:  { icon: XCircle,      color: 'text-red-500',     label: 'Failed' },
  skipped: { icon: AlertCircle,  color: 'text-amber-500',   label: 'Skipped' },
  pending: { icon: Clock,        color: 'text-gray-400',    label: 'Pending' },
};

const TABS = ['Compose', 'Logs', 'Stats'];

export default function WhatsAppPage() {
  const [activeTab, setActiveTab]   = useState('Compose');
  const [classes,   setClasses]     = useState([]);
  const [logs,      setLogs]        = useState([]);
  const [stats,     setStats]       = useState({});
  const [loading,   setLoading]     = useState(true);
  const [sending,   setSending]     = useState(false);

  // Compose state
  const [scope,     setScope]       = useState('all');
  const [classId,   setClassId]     = useState('');
  const [template,  setTemplate]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [classRes, logsRes, statsRes] = await Promise.all([
        getClasses(),
        getWhatsAppLogs({ limit: 50 }),
        getWhatsAppStats(),
      ]);
      setClasses(classRes.data || []);
      setLogs(logsRes.data?.data ?? logsRes.data ?? []);
      setStats(statsRes.data?.data ?? statsRes.data ?? {});
    } catch {
      toast.error('Failed to load WhatsApp data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSend() {
    if (!template) return toast.error('Select a message template');
    setSending(true);
    try {
      const scopeObj = scope === 'class' ? { type: 'class', class_id: classId } : { type: scope };
      const res = await sendBulkWhatsApp({ scope: scopeObj, template });
      const d = res.data?.data ?? {};
      toast.success(`Sent: ${d.sent || 0} · Failed: ${d.failed || 0} · Skipped: ${d.skipped || 0}`);
      setActiveTab('Logs');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Layout><PageLoader /></Layout>;

  const totalSent  = stats.sent    || 0;
  const totalFail  = stats.failed  || 0;
  const totalSkip  = stats.skipped || 0;
  const totalAll   = totalSent + totalFail + totalSkip;

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="text-emerald-500" size={24} />
              WhatsApp Campaigns
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Send bulk messages via WhatsApp Business API</p>
          </div>
          <button onClick={load} className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Stat pills */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Sent (30d)',    value: totalSent,  color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
            { label: 'Failed (30d)',  value: totalFail,  color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
            { label: 'Skipped (30d)', value: totalSkip,  color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
          ].map(p => (
            <div key={p.label} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${p.color}`}>
              {p.label}: <span className="text-lg font-bold">{p.value}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Compose Tab */}
        {activeTab === 'Compose' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900 dark:text-white">New Campaign</h2>

            {/* Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recipients</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'all',     label: 'All Parents',    icon: Users },
                  { value: 'class',   label: 'By Class',       icon: ChevronDown },
                  { value: 'section', label: 'By Section',     icon: ChevronDown },
                ].map(o => (
                  <button key={o.value} onClick={() => setScope(o.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all
                      ${scope === o.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
                    <o.icon size={18} />
                    {o.label}
                  </button>
                ))}
              </div>
              {scope === 'class' && (
                <select value={classId} onChange={e => setClassId(e.target.value)}
                  className="mt-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Select Class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            {/* Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message Template</label>
              <div className="space-y-2">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setTemplate(t.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all
                      ${template === t.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                    <p className={`font-medium text-sm ${template === t.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Send */}
            <button onClick={handleSend} disabled={sending || !template}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? 'Sending…' : 'Send Campaign'}
            </button>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'Logs' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">To</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Template</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {logs.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-gray-400">No messages sent yet</td></tr>
                  ) : logs.map(log => {
                    const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{log.to_phone}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{log.template}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                            <cfg.icon size={13} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(log.created_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'Stats' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Messages Sent',    value: totalSent,  desc: 'Last 30 days', color: 'text-emerald-600', icon: CheckCircle2 },
              { label: 'Delivery Failed',  value: totalFail,  desc: 'Last 30 days', color: 'text-red-500',     icon: XCircle },
              { label: 'Rate',
                value: totalAll ? `${Math.round((totalSent / totalAll) * 100)}%` : '—',
                desc: 'Success rate',    color: 'text-indigo-600', icon: BarChart3 },
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <c.icon size={20} className={c.color} />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{c.label}</span>
                </div>
                <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
