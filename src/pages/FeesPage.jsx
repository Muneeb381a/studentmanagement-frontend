import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Banknote, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Clock3, ChevronDown, Search, Plus, Pencil, Trash2, Save, X,
  Download, RefreshCw, Eye, CreditCard, Layers, ReceiptText,
  Settings2, BarChart3, CalendarDays, Users, Printer, FileText,
  Tag, Zap, MessageSquare, Copy, Check, Send, Mail, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadBlob } from '../utils';
import Layout from '../components/layout/Layout';
import { getClasses } from '../api/classes';
import { getStudents } from '../api/students';
import {
  getFeeHeads, createFeeHead, updateFeeHead, deleteFeeHead,
  getFeeStructures, upsertFeeStructure, deleteFeeStructure,
  getInvoices, getInvoice, createInvoice, generateMonthlyFees, generateAdmissionInvoice,
  updateInvoice, cancelInvoice, recordPayment, bulkRecordPayments, getMonthlySummary,
  getOutstandingBalances, getDashboardStats, getExportURL,
  getConcessions, saveConcession, deleteConcession, applyLateFees,
  sendFeeReminders,
} from '../api/fees';
import { getSettings } from '../api/settings';

// ── Constants ─────────────────────────────────────────────────
const STATUS_CONFIG = {
  paid:      { label: 'Paid',     color: '#16a34a', bg: '#f0fdf4', border: '#86efac', dot: 'bg-emerald-500' },
  partial:   { label: 'Partial',  color: '#d97706', bg: '#fffbeb', border: '#fcd34d', dot: 'bg-amber-500'   },
  unpaid:    { label: 'Unpaid',   color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', dot: 'bg-red-500'     },
  overdue:   { label: 'Overdue',  color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe', dot: 'bg-purple-500'  },
  cancelled: { label: 'Cancelled',color: '#64748b', bg: '#f8fafc', border: '#cbd5e1', dot: 'bg-slate-400'   },
  waived:    { label: 'Waived',   color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', dot: 'bg-sky-500'     },
};
const METHODS = ['cash','bank','online','cheque','dd'];
const CATEGORIES = { admission: 'Admission', monthly: 'Monthly', one_time: 'One-Time' };
const CAT_COLORS  = {
  admission: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  monthly:   { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  one_time:  { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
};
const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const currentMonth = () => new Date().toISOString().slice(0, 7);

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.unpaid;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={{ background: c.bg, color: c.color, borderColor: c.border }}>
      <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function Sel({ label, value, onChange, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>}
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
          {children}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
    </div>
  );
}

// ── Payment Modal ──────────────────────────────────────────────
function PaymentModal({ invoice, onClose, onPaid }) {
  const net     = parseFloat(invoice.net_amount || invoice.total_amount) + parseFloat(invoice.fine_amount || 0) - parseFloat(invoice.discount_amount || 0);
  const balance = net - parseFloat(invoice.paid_amount || 0);

  const [form, setForm] = useState({
    amount: balance.toFixed(0),
    payment_method: 'cash',
    payment_date: new Date().toISOString().slice(0, 10),
    bank_name: '', transaction_ref: '', remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePay = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      const res = await recordPayment({ invoice_id: invoice.id, ...form });
      const msg = res.data?.message || 'Payment recorded';
      toast.success(msg);
      onPaid();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
              <CreditCard size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Record Payment</h2>
              <p className="text-xs text-slate-400">{invoice.invoice_no} · {invoice.student_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>

        {/* Balance info */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-4 text-center">
          {[['Total', fmt(net)], ['Paid', fmt(invoice.paid_amount)], ['Balance', fmt(balance)]].map(([l, v]) => (
            <div key={l}>
              <div className="text-xs text-slate-400">{l}</div>
              <div className={`text-sm font-bold ${l === 'Balance' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                Rs. {v}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handlePay} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (Rs.)" type="number" value={form.amount} onChange={v => set('amount', v)} placeholder={balance.toFixed(0)} />
            <Input label="Date" type="date" value={form.payment_date} onChange={v => set('payment_date', v)} />
          </div>
          <Sel label="Payment Method" value={form.payment_method} onChange={v => set('payment_method', v)}>
            {METHODS.map(m => <option key={m} value={m} className="capitalize">{m.toUpperCase()}</option>)}
          </Sel>
          {['bank','cheque','dd'].includes(form.payment_method) && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Bank Name" value={form.bank_name} onChange={v => set('bank_name', v)} placeholder="Bank name" />
              <Input label="Transaction / Cheque Ref" value={form.transaction_ref} onChange={v => set('transaction_ref', v)} placeholder="Ref no." />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Remarks (optional)</label>
            <textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} placeholder="Any notes…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
              style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Pay Rs. {fmt(form.amount)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── WhatsApp message builder ───────────────────────────────────
function buildWhatsAppText(inv, settings) {
  const s = settings || {};
  const schoolName  = s.school_name  || 'School Management System';
  const schoolPhone = s.school_phone || '';
  const bankName    = s.bank_name    || '';
  const bankTitle   = s.bank_account_title || '';
  const bankAccNo   = s.bank_account_no    || '';
  const bankIban    = s.bank_iban          || '';
  const bankBranch  = s.bank_branch        || '';

  const net     = parseFloat(inv.total_amount || 0) + parseFloat(inv.fine_amount || 0) - parseFloat(inv.discount_amount || 0);
  const balance = net - parseFloat(inv.paid_amount || 0);
  const fmtAmt  = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const lines = [
    `Assalam-o-Alaikum! 🌙`,
    ``,
    `Dear Parent/Guardian of *${inv.student_name || ''}*,`,
    ``,
    `📢 *Fee Reminder — ${schoolName}*`,
    ``,
    `🎓 *Student:* ${inv.student_name || '—'}`,
    `🏫 *Class:* ${inv.class_name || '—'}`,
    inv.roll_number ? `🔢 *Roll No:* ${inv.roll_number}` : null,
    `📋 *Invoice No:* ${inv.invoice_no || '—'}`,
    inv.billing_month ? `📅 *Month:* ${inv.billing_month}` : null,
    inv.due_date ? `📆 *Due Date:* ${fmtDate(inv.due_date)}` : null,
    ``,
    `💰 *Total Fee:* ${fmtAmt(net)}`,
    parseFloat(inv.paid_amount) > 0 ? `✅ *Paid:* ${fmtAmt(inv.paid_amount)}` : null,
    `⚠️ *Balance Due: ${fmtAmt(balance)}*`,
    ``,
  ];

  if (bankName) {
    lines.push(`🏦 *Bank Payment Details:*`);
    lines.push(`Bank: ${bankName}`);
    if (bankTitle)  lines.push(`Account Title: ${bankTitle}`);
    if (bankAccNo)  lines.push(`Account No: ${bankAccNo}`);
    if (bankIban)   lines.push(`IBAN: ${bankIban}`);
    if (bankBranch) lines.push(`Branch: ${bankBranch}`);
    lines.push(``);
  }

  if (inv.due_date) lines.push(`Kindly pay before *${fmtDate(inv.due_date)}* to avoid late fine.`);
  else lines.push(`Kindly pay the outstanding balance at your earliest convenience.`);
  lines.push(``);
  lines.push(`Regards,`);
  lines.push(`*${schoolName}*`);
  if (schoolPhone) lines.push(`📞 ${schoolPhone}`);

  return lines.filter(l => l !== null).join('\n');
}

// ── WhatsApp Reminder Modal (single + bulk) ────────────────────
function WhatsAppReminderModal({ inv, onClose }) {
  const [settings,     setSettings]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [copiedId,     setCopiedId]     = useState(null);
  const [bulkIdx,      setBulkIdx]      = useState(0);

  const isBulk = inv?._bulk === true;
  const list   = isBulk ? (inv._list || []) : [inv];
  const current = list[bulkIdx] || list[0];

  useEffect(() => {
    getSettings()
      .then(r => setSettings(r.data?.data ?? r.data))
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, []);

  const getMessage = (item) => settings ? buildWhatsAppText(item, settings) : '';

  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(getMessage(item));
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Message copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleOpenWhatsApp = (item) => {
    const phone = item.father_phone || item.student_phone || '';
    const clean = phone.replace(/\D/g, '');
    const intl  = clean.startsWith('0') ? '92' + clean.slice(1) : clean.startsWith('92') ? clean : '92' + clean;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(getMessage(item))}`, '_blank');
  };

  const balance = (item) => parseFloat(item.total_amount || 0) + parseFloat(item.fine_amount || 0)
    - parseFloat(item.discount_amount || 0) - parseFloat(item.paid_amount || 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full border border-slate-200 dark:border-slate-700 flex flex-col max-h-[92vh]"
        style={{ maxWidth: isBulk ? '860px' : '520px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
              <MessageSquare size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {isBulk ? `WhatsApp Reminders — ${list.length} Outstanding` : 'WhatsApp Fee Reminder'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBulk ? 'Copy each message and send to parent\'s WhatsApp' : `${current.student_name} · ${current.invoice_no}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {isBulk ? (
          /* ── BULK VIEW ── */
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : list.map((item) => {
              const phone   = item.father_phone || item.student_phone || '';
              const bal     = balance(item);
              const isCopied = copiedId === item.id;
              return (
                <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {/* Student header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.student_name}</span>
                      <span className="ml-2 text-xs text-slate-400">{item.class_name || '—'} · {item.invoice_no}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Balance</p>
                        <p className="text-sm font-black text-red-600">Rs. {Number(bal).toLocaleString('en-PK', { minimumFractionDigits: 0 })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Phone</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{phone || '—'}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleCopy(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all"
                          style={isCopied
                            ? { borderColor: '#16a34a', color: '#16a34a', background: '#f0fdf4' }
                            : { borderColor: '#6366f1', color: '#6366f1', background: 'white' }}
                        >
                          {isCopied ? <Check size={11} /> : <Copy size={11} />}
                          {isCopied ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={() => handleOpenWhatsApp(item)}
                          disabled={!phone}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-40 transition-all"
                          style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}
                        >
                          <Send size={11} /> {phone ? 'Send' : 'No Phone'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Message preview (compact) */}
                  <textarea
                    readOnly
                    value={getMessage(item)}
                    rows={5}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-[10px] font-mono leading-relaxed resize-none focus:outline-none border-t border-slate-100 dark:border-slate-800"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          /* ── SINGLE VIEW ── */
          <>
            {/* Info strip */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Balance Due</p>
                  <p className="text-lg font-black text-red-600">Rs. {Number(balance(current)).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Parent Phone</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {current.father_phone || current.student_phone || 'No phone on record'}
                  </p>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Message Preview</p>
                  <textarea
                    readOnly
                    value={getMessage(current)}
                    rows={18}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-mono leading-relaxed resize-none focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    * denotes bold text in WhatsApp. You can edit the message after copying.
                  </p>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-2">
              <button
                onClick={() => handleCopy(current)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all disabled:opacity-50"
                style={copiedId === current.id
                  ? { borderColor: '#16a34a', color: '#16a34a', background: '#f0fdf4' }
                  : { borderColor: '#6366f1', color: '#6366f1', background: 'white' }}
              >
                {copiedId === current.id ? <Check size={15} /> : <Copy size={15} />}
                {copiedId === current.id ? 'Copied!' : 'Copy Message'}
              </button>
              <button
                onClick={() => handleOpenWhatsApp(current)}
                disabled={loading || !(current.father_phone || current.student_phone)}
                title={!(current.father_phone || current.student_phone) ? 'No phone number on record' : ''}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}
              >
                <Send size={15} />
                {(current.father_phone || current.student_phone) ? 'Open WhatsApp' : 'No Phone Number'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Invoice Detail Modal ───────────────────────────────────────
function InvoiceDetailModal({ invoiceId, onClose, onPayClick, onWhatsApp }) {
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoice(invoiceId).then(r => setInv(r.data?.data ?? r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /></div>
  );
  if (!inv) return null;

  const net     = parseFloat(inv.total_amount) + parseFloat(inv.fine_amount || 0) - parseFloat(inv.discount_amount || 0);
  const balance = net - parseFloat(inv.paid_amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{inv.invoice_no}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{inv.student_name} · {inv.class_name || '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={inv.status} />
            <button
              onClick={() => window.open(`/fees/invoice/${inv.id}/print`, '_blank')}
              title="Print Invoice"
              className="p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition-colors">
              <Printer size={15} />
            </button>
            <button
              onClick={() => window.open(`/fees/invoice/${inv.id}/challan`, '_blank')}
              title="Print Fee Challan (Bank Copy)"
              className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-600 transition-colors">
              <FileText size={15} />
            </button>
            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
              <button
                onClick={() => onWhatsApp && onWhatsApp(inv)}
                title="Send WhatsApp Reminder"
                className="p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                style={{ '--tw-bg-opacity': 1 }}
                onMouseEnter={e => e.currentTarget.style.background = '#25d366'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <MessageSquare size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Amounts */}
          <div className="grid grid-cols-4 gap-3">
            {[
              ['Total', net,               '#64748b'],
              ['Paid',  inv.paid_amount,   '#16a34a'],
              ['Balance', balance,         balance > 0 ? '#dc2626' : '#16a34a'],
              ['Due', inv.due_date || '—', '#d97706'],
            ].map(([l, v, c]) => (
              <div key={l} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400">{l}</div>
                <div className="text-sm font-bold mt-0.5" style={{ color: c }}>
                  {l === 'Due' ? (v === '—' ? '—' : v) : `Rs. ${fmt(v)}`}
                </div>
              </div>
            ))}
          </div>

          {/* Items */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fee Breakdown</h3>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              {inv.items?.map((item, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''} ${item.is_waived ? 'opacity-50 line-through' : ''}`}>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item.description}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rs. {fmt(item.amount)}</span>
                </div>
              ))}
              {inv.discount_amount > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <span className="text-sm text-emerald-700 dark:text-emerald-400">Discount</span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">- Rs. {fmt(inv.discount_amount)}</span>
                </div>
              )}
              {inv.fine_amount > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-red-50/50 dark:bg-red-900/10">
                  <span className="text-sm text-red-700 dark:text-red-400">Late Fine</span>
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">+ Rs. {fmt(inv.fine_amount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-2.5 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-bold">
                <span className="text-sm text-slate-700 dark:text-slate-200">Net Payable</span>
                <span className="text-sm text-slate-800 dark:text-slate-100">Rs. {fmt(net)}</span>
              </div>
            </div>
          </div>

          {/* Payments */}
          {inv.payments?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payment History</h3>
              <div className="space-y-2">
                {inv.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">Rs. {fmt(p.amount)}</div>
                      <div className="text-xs text-slate-400">{p.receipt_no} · {p.payment_date} · {p.payment_method.toUpperCase()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-900/20 dark:text-emerald-400">Received</span>
                      <button
                        onClick={() => window.open(`/fees/receipt/${p.id}`, '_blank')}
                        title="Print Receipt"
                        className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Printer size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {balance > 0.01 && inv.status !== 'cancelled' && (
            <button onClick={() => onPayClick(inv)}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-md"
              style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
              <CreditCard size={16} />
              Pay Remaining Rs. {fmt(balance)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Invoice Modal ───────────────────────────────────────
function CreateInvoiceModal({ onClose, onCreated, feeHeads }) {
  const [query,      setQuery]      = useState('');
  const [students,   setStudents]   = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [searching,  setSearching]  = useState(false);
  const [invoiceType, setType]      = useState('one_time');
  const [month,      setMonth]      = useState('');
  const [dueDate,    setDueDate]    = useState('');
  const [notes,      setNotes]      = useState('');
  const [items,      setItems]      = useState([{ description: '', amount: '', fee_head_id: '' }]);
  const [saving,     setSaving]     = useState(false);
  const debounceRef                 = useRef(null);

  // Debounced student search
  useEffect(() => {
    if (!query.trim()) { setStudents([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await getStudents({ search: query, limit: 8 });
        setStudents(Array.isArray(r.data) ? r.data : []);
      } catch { setStudents([]); }
      finally { setSearching(false); }
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const addItem    = () => setItems(it => [...it, { description: '', amount: '', fee_head_id: '' }]);
  const removeItem = (i) => setItems(it => it.filter((_, idx) => idx !== i));
  const setItem    = (i, k, v) => setItems(it => it.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const total = items.reduce((s, it) => s + parseFloat(it.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) { toast.error('Select a student'); return; }
    const valid = items.filter(it => it.description.trim() && parseFloat(it.amount || 0) > 0);
    if (valid.length === 0) { toast.error('Add at least one fee item with description and amount'); return; }
    setSaving(true);
    try {
      const res = await createInvoice({
        student_id: selected.id,
        invoice_type: invoiceType,
        billing_month: invoiceType === 'monthly' ? month : undefined,
        due_date: dueDate || undefined,
        notes: notes || undefined,
        items: valid.map(it => ({
          description: it.description.trim(),
          amount: parseFloat(it.amount),
          fee_head_id: it.fee_head_id || undefined,
        })),
      });
      const inv = res.data?.data ?? res.data;
      toast.success(`Invoice ${inv.invoice_no} created — Rs. ${fmt(inv.total_amount)}`);
      onCreated();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create invoice'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">New Invoice</h2>
              <p className="text-xs text-slate-400">Create a custom fee invoice for any student</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* ── Student search ── */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Student *</label>
            {selected ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20">
                <div>
                  <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{selected.full_name}</div>
                  <div className="text-xs text-indigo-500">{selected.class_name || 'No class'}{selected.roll_number ? ` · Roll: ${selected.roll_number}` : ''}</div>
                </div>
                <button type="button" onClick={() => { setSelected(null); setQuery(''); }}
                  className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-400 hover:text-indigo-600 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type student name to search…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                {(students.length > 0 || searching) && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                    {searching
                      ? <div className="p-3 text-sm text-slate-400 text-center">Searching…</div>
                      : students.map(s => (
                          <button key={s.id} type="button" onClick={() => { setSelected(s); setQuery(''); setStudents([]); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.full_name}</div>
                            <div className="text-xs text-slate-400">{s.class_name || 'No class assigned'}{s.roll_number ? ` · Roll: ${s.roll_number}` : ''}</div>
                          </button>
                        ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Invoice type ── */}
          <div className="grid grid-cols-3 gap-2">
            {[['admission','Admission'],['monthly','Monthly'],['one_time','One-Time']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setType(k)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${invoiceType === k ? 'text-white border-transparent shadow-sm' : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                style={invoiceType === k ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
                {l}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {invoiceType === 'monthly' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Billing Month *</label>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </div>
          </div>

          {/* ── Fee items ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Fee Items *</label>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium">
                <Plus size={12} /> Add row
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <input
                      value={item.description}
                      onChange={e => setItem(i, 'description', e.target.value)}
                      placeholder="Description (e.g. Tuition Fee)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                  </div>
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      min="1"
                      value={item.amount}
                      onChange={e => setItem(i, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                  </div>
                  <div className="w-36 shrink-0">
                    <select value={item.fee_head_id} onChange={e => setItem(i, 'fee_head_id', e.target.value)}
                      className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none">
                      <option value="">No category</option>
                      {feeHeads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-0.5">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {total > 0 && (
              <div className="mt-3 flex justify-end">
                <div className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                  <span className="text-xs text-indigo-500">Total: </span>
                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Rs. {fmt(total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Notes ── */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any remarks…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ReceiptText size={14} />}
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Bulk Pay Modal ────────────────────────────────────────────
function BulkPayModal({ count, onClose, onConfirm }) {
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = 'w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all';

  const handleConfirm = async () => {
    setSaving(true);
    try { await onConfirm(form); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Bulk Record Payment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
        </div>
        <p className="text-sm text-slate-500">Record full payment for <strong>{count}</strong> selected invoice{count !== 1 ? 's' : ''}.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Date</label>
            <input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Method</label>
            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={`${inp} appearance-none cursor-pointer`}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleConfirm} disabled={saving} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {saving ? 'Processing…' : `Pay ${count} Invoice${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Invoices ─────────────────────────────────────────────
function InvoicesTab({ classes, feeHeads }) {
  const [invoices,     setInvoices]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass,  setFilterClass]  = useState('');
  const [filterMonth,  setFilterMonth]  = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [payInvoice,   setPayInvoice]   = useState(null);
  const [viewInvoice,  setViewInvoice]  = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [bulkModal,    setBulkModal]    = useState(false);
  const [whatsAppInv,  setWhatsAppInv]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = { limit: 200 };
      if (filterStatus) p.status = filterStatus;
      if (filterClass)  p.class_id = filterClass;
      if (filterMonth)  p.billing_month = filterMonth;
      if (filterType)   p.invoice_type = filterType;
      if (search)       p.search = search;
      const res = await getInvoices(p);
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [filterStatus, filterClass, filterMonth, filterType, search]);

  useEffect(() => { load(); }, [load]);

  const handleExportInvoices = async () => {
    try {
      const res = await getExportURL({
        ...(filterMonth  ? { billing_month: filterMonth } : {}),
        ...(filterClass  ? { class_id: filterClass } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterType   ? { invoice_type: filterType } : {}),
      });
      downloadBlob(res.data, `fees_invoices_${filterMonth || 'all'}.csv`);
    } catch { toast.error('Export failed'); }
  };

  const totals = useMemo(() => invoices.reduce((a, r) => ({
    billed:    a.billed    + parseFloat(r.net_amount  || r.total_amount || 0),
    collected: a.collected + parseFloat(r.paid_amount || 0),
    balance:   a.balance   + parseFloat(r.balance     || 0),
  }), { billed: 0, collected: 0, balance: 0 }), [invoices]);

  const payableInvoices = invoices.filter(inv => parseFloat(inv.balance || 0) > 0.01 && inv.status !== 'cancelled');
  const allPayableSelected = payableInvoices.length > 0 && payableInvoices.every(inv => selectedIds.has(inv.id));

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAllPayable = () => {
    if (allPayableSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(payableInvoices.map(inv => inv.id)));
  };

  const handleBulkPay = async (form) => {
    try {
      const r = await bulkRecordPayments({ invoice_ids: [...selectedIds], ...form });
      const msg = r.data?.message || r.data?.data?.message || `${r.data?.saved ?? selectedIds.size} invoice(s) paid`;
      toast.success(msg);
      setSelectedIds(new Set());
      setBulkModal(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Bulk payment failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, invoice no…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 dark:text-slate-100" />
          </div>
          <Sel value={filterStatus} onChange={setFilterStatus} className="w-36">
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Sel>
          <Sel value={filterType} onChange={setFilterType} className="w-36">
            <option value="">All Types</option>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
          <Sel value={filterClass} onChange={setFilterClass} className="w-44">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Month</label>
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <button onClick={() => setBulkModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
                style={{ background: 'linear-gradient(135deg,#16a34a,#059669)' }}>
                <CreditCard size={14} /> Pay {selectedIds.size} Selected
              </button>
            )}
            <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExportInvoices}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-md"
              style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => {
                const p = new URLSearchParams();
                if (filterMonth)  p.set('billing_month', filterMonth);
                if (filterClass)  p.set('class_id', filterClass);
                if (filterStatus) p.set('status', filterStatus);
                if (filterType)   p.set('invoice_type', filterType);
                window.open(`/fees/bulk-print?${p.toString()}`, '_blank');
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
              <Printer size={14} /> Bulk Print
            </button>
            <button
              onClick={() => {
                const outstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
                if (!outstanding.length) { toast.error('No outstanding invoices to remind'); return; }
                setWhatsAppInv({ _bulk: true, _list: outstanding });
              }}
              title="Bulk WhatsApp Reminders for all outstanding invoices"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
              style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
              <MessageSquare size={14} /> WhatsApp Reminders
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Plus size={14} /> New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Totals strip */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: 'Total Billed',  v: totals.billed,    color: '#6366f1' },
            { l: 'Collected',     v: totals.collected, color: '#16a34a' },
            { l: 'Outstanding',   v: totals.balance,   color: '#dc2626' },
          ].map(({ l, v, color }) => (
            <div key={l} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color }}>
                <Banknote size={17} className="text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">Rs. {fmt(v)}</div>
                <div className="text-xs text-slate-400">{l} ({invoices.length} invoices)</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 flex items-center justify-center shadow-sm">
          <div className="w-8 h-8 border-2 border-t-emerald-600 border-emerald-200 rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 bg-slate-100 dark:bg-slate-800">
            <ReceiptText size={24} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-500 dark:text-slate-400">No invoices found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or generate fees first</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 w-8">
                    {payableInvoices.length > 0 && (
                      <input type="checkbox" checked={allPayableSelected} onChange={toggleAllPayable}
                        className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 cursor-pointer" />
                    )}
                  </th>
                  {['Invoice','Student','Class','Type','Month','Total','Paid','Balance','Status',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => {
                  const net     = parseFloat(inv.net_amount  || inv.total_amount || 0);
                  const balance = parseFloat(inv.balance     || 0);
                  const cat     = CAT_COLORS[inv.invoice_type] || CAT_COLORS.one_time;
                  const isPayable = balance > 0.01 && inv.status !== 'cancelled';
                  return (
                    <tr key={inv.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.has(inv.id) ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : i % 2 ? 'bg-slate-50/20 dark:bg-slate-800/10' : ''}`}>
                      <td className="px-4 py-3 w-8">
                        {isPayable && (
                          <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 cursor-pointer" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">{inv.invoice_no}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[160px]">{inv.student_name}</div>
                        {inv.roll_number && <div className="text-xs text-slate-400">Roll: {inv.roll_number}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{inv.class_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                          style={{ background: cat.bg, color: cat.text, borderColor: cat.border }}>
                          {CATEGORIES[inv.invoice_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{inv.billing_month || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 text-right">Rs. {fmt(net)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400 text-right">Rs. {fmt(inv.paid_amount)}</td>
                      <td className="px-4 py-3 font-semibold text-right" style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>Rs. {fmt(balance)}</td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewInvoice(inv.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors">
                            <Eye size={14} />
                          </button>
                          {balance > 0.01 && inv.status !== 'cancelled' && (
                            <button onClick={() => setPayInvoice(inv)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-600 transition-colors">
                              <CreditCard size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => window.open(`/fees/invoice/${inv.id}/challan`, '_blank')}
                            title="Print Fee Challan"
                            className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 hover:text-amber-600 transition-colors">
                            <FileText size={14} />
                          </button>
                          {isPayable && (
                            <button
                              onClick={() => setWhatsAppInv(inv)}
                              title="WhatsApp Fee Reminder"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                              onMouseEnter={e => e.currentTarget.style.background = '#25d366'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <MessageSquare size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {payInvoice && (
        <PaymentModal invoice={payInvoice} onClose={() => setPayInvoice(null)} onPaid={() => { setPayInvoice(null); load(); }} />
      )}
      {viewInvoice && (
        <InvoiceDetailModal invoiceId={viewInvoice} onClose={() => setViewInvoice(null)}
          onPayClick={(inv) => { setViewInvoice(null); setPayInvoice(inv); }}
          onWhatsApp={(inv) => { setViewInvoice(null); setWhatsAppInv(inv); }} />
      )}
      {whatsAppInv && (
        <WhatsAppReminderModal inv={whatsAppInv} onClose={() => setWhatsAppInv(null)} />
      )}
      {bulkModal && (
        <BulkPayModal
          count={selectedIds.size}
          onClose={() => setBulkModal(false)}
          onConfirm={handleBulkPay}
        />
      )}
      {showCreate && (
        <CreateInvoiceModal
          feeHeads={feeHeads}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Tab: Generate Fees ────────────────────────────────────────
function GenerateTab({ classes }) {
  const [mode,         setMode]      = useState('monthly');
  const [classId,      setClassId]   = useState('');
  const [month,        setMonth]     = useState(currentMonth());
  const [dueDate,      setDueDate]   = useState('');
  const [year,         setYear]      = useState('2024-25');
  // Admission: student search
  const [stuQuery,     setStuQuery]  = useState('');
  const [stuResults,   setStuRes]    = useState([]);
  const [selStudent,   setSelStu]    = useState(null);
  const [stuSearching, setStuSrch]   = useState(false);
  const [loading,      setLoading]   = useState(false);
  const [result,       setResult]    = useState(null);
  const debRef                       = useRef(null);

  useEffect(() => {
    if (!stuQuery.trim()) { setStuRes([]); return; }
    clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setStuSrch(true);
      try {
        const r = await getStudents({ search: stuQuery, limit: 8 });
        setStuRes(Array.isArray(r.data) ? r.data : []);
      } catch { setStuRes([]); }
      finally { setStuSrch(false); }
    }, 280);
    return () => clearTimeout(debRef.current);
  }, [stuQuery]);

  const handleGenerate = async () => {
    if (mode === 'monthly' && !month) { toast.error('Select billing month'); return; }
    if (mode === 'admission' && !selStudent) { toast.error('Select a student first'); return; }
    setLoading(true); setResult(null);
    try {
      if (mode === 'monthly') {
        const res = await generateMonthlyFees({ class_id: classId || undefined, billing_month: month, academic_year: year, due_date: dueDate || undefined });
        setResult(res.data);
        toast.success(res.data?.message || 'Done');
      } else {
        const res = await generateAdmissionInvoice(selStudent.id, { academic_year: year, due_date: dueDate || undefined });
        const inv = res.data?.data ?? res.data;
        setResult({ created: 1, invoice_no: inv.invoice_no, total_amount: inv.total_amount });
        toast.success(`Admission invoice created: ${inv.invoice_no}`);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to generate'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Generate Invoices</h2>
          <p className="text-xs text-slate-400 mt-0.5">Bulk-generate monthly fees or create an admission invoice</p>
        </div>

        {/* Mode */}
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {[['monthly','Monthly Fees'],['admission','Admission Invoice']].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${mode === k ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              style={mode === k ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
              {l}
            </button>
          ))}
        </div>

        {mode === 'monthly' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Billing Month *</label>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
            </div>
            <Sel label="Class (leave blank for all classes)" value={classId} onChange={setClassId}>
              <option value="">— All Classes —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>)}
            </Sel>
            <Sel label="Academic Year" value={year} onChange={setYear}>
              {['2023-24','2024-25','2025-26','2026-27'].map(y => <option key={y} value={y}>{y}</option>)}
            </Sel>
          </>
        ) : (
          <>
            {/* Student search for admission invoice */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Student *</label>
              {selStudent ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20">
                  <div>
                    <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{selStudent.full_name}</div>
                    <div className="text-xs text-indigo-500">{selStudent.class_name || 'No class'}</div>
                  </div>
                  <button type="button" onClick={() => { setSelStu(null); setStuQuery(''); setStuRes([]); }}
                    className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-400 hover:text-indigo-600 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={stuQuery} onChange={e => setStuQuery(e.target.value)} placeholder="Search student by name…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                  {(stuResults.length > 0 || stuSearching) && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {stuSearching
                        ? <div className="p-3 text-sm text-slate-400 text-center">Searching…</div>
                        : stuResults.map(s => (
                            <button key={s.id} type="button" onClick={() => { setSelStu(s); setStuQuery(''); setStuRes([]); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.full_name}</div>
                              <div className="text-xs text-slate-400">{s.class_name || 'No class'}</div>
                            </button>
                          ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Sel label="Academic Year" value={year} onChange={setYear}>
                {['2023-24','2024-25','2025-26','2026-27'].map(y => <option key={y} value={y}>{y}</option>)}
              </Sel>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
            </div>
          </>
        )}

        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-400">
          {mode === 'monthly'
            ? 'Students who already have an invoice for the selected month will be skipped automatically.'
            : 'An admission invoice will be generated using the fee structures defined for the student\'s class.'}
        </div>

        <button onClick={handleGenerate} disabled={loading}
          className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ReceiptText size={16} />}
          Generate {mode === 'monthly' ? 'Monthly Fees' : 'Admission Invoice'}
        </button>
      </div>

      {result && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center"><CheckCircle2 size={16} className="text-white" /></div>
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">Generation Complete</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {result.created !== undefined && <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{result.created}</div><div className="text-slate-400 text-xs">Invoices Created</div></div>}
            {result.skipped !== undefined && <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-slate-500">{result.skipped}</div><div className="text-slate-400 text-xs">Skipped</div></div>}
            {result.invoice_no && <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl p-3 text-center"><div className="font-mono font-bold text-indigo-600">{result.invoice_no}</div><div className="text-xs text-slate-400">Total: Rs. {fmt(result.total_amount)}</div></div>}
          </div>
        </div>
      )}

      <LateFeeCard />
    </div>
  );
}

// ── Late Fee Card (used inside GenerateTab) ────────────────────
function LateFeeCard() {
  const [feeType,  setFeeType]  = useState('fixed');
  const [feeValue, setFeeValue] = useState('');
  const [month,    setMonth]    = useState('');
  const [applying, setApplying] = useState(false);
  const [result,   setResult]   = useState(null);

  const handleApply = async () => {
    if (!feeValue || parseFloat(feeValue) <= 0) { toast.error('Enter a late fee value > 0'); return; }
    setApplying(true); setResult(null);
    try {
      const res = await applyLateFees({
        late_fee_type: feeType,
        late_fee_value: parseFloat(feeValue),
        ...(month ? { billing_month: month } : {}),
      });
      const d = res.data?.data ?? res.data;
      setResult(d);
      toast.success(d?.message || 'Done');
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setApplying(false); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-orange-200 dark:border-orange-800/40 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)' }}>
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Apply Late Fee Surcharge</h3>
          <p className="text-xs text-slate-400">Add surcharge to all overdue unpaid invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Type</label>
          <div className="relative">
            <select value={feeType} onChange={e => setFeeType(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/30">
              <option value="fixed">Fixed (PKR)</option>
              <option value="percent">Percent (%)</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Amount {feeType === 'percent' ? '(%)' : '(PKR)'}
          </label>
          <input type="number" min="0.01" step="0.01" value={feeValue}
            onChange={e => setFeeValue(e.target.value)}
            placeholder={feeType === 'percent' ? 'e.g. 5' : 'e.g. 200'}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Billing Month (optional — leave blank for all overdue)</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
      </div>

      <button onClick={handleApply} disabled={applying}
        className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)' }}>
        {applying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap size={14} />}
        Apply Late Fee
      </button>

      {result && (
        <div className={`rounded-xl p-3 text-sm font-medium ${result.updated > 0 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}

// ── Tab: Concessions ──────────────────────────────────────────
function ConcessionsTab({ classes, feeHeads }) {
  const [classId,     setClassId]   = useState('');
  const [students,    setStudents]  = useState([]);
  const [studentId,   setStudentId] = useState('');
  const [items,       setItems]     = useState([]);
  const [loading,     setLoading]   = useState(false);
  const [modal,       setModal]     = useState(null); // null | { student_id } | concession obj
  const [delId,       setDelId]     = useState(null);

  // Form state
  const emptyForm = { fee_head_id: '', discount_type: 'fixed', discount_value: '', reason: '', is_active: true };
  const [form,  setForm]  = useState(emptyForm);
  const [saving,setSaving]= useState(false);

  // Load students when class changes
  useEffect(() => {
    if (!classId) { setStudents([]); setStudentId(''); return; }
    getStudents({ class_id: classId, status: 'active', limit: 200 })
      .then(r => setStudents(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [classId]);

  // Load concessions when student changes
  const load = useCallback(async () => {
    if (!studentId) { setItems([]); return; }
    setLoading(true);
    try {
      const r = await getConcessions({ student_id: studentId });
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch { toast.error('Failed to load concessions'); }
    finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm({ ...emptyForm, student_id: studentId });
    setModal({ student_id: studentId });
  };
  const openEdit = (c) => {
    setForm({ id: c.id, student_id: c.student_id, fee_head_id: c.fee_head_id || '', discount_type: c.discount_type, discount_value: c.discount_value, reason: c.reason || '', is_active: c.is_active });
    setModal(c);
  };

  const handleSave = async () => {
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) { toast.error('Discount value must be > 0'); return; }
    setSaving(true);
    try {
      await saveConcession({ ...form, fee_head_id: form.fee_head_id || null });
      toast.success(form.id ? 'Concession updated' : 'Concession added');
      setModal(null);
      load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteConcession(id);
      toast.success('Deleted');
      setDelId(null);
      load();
    } catch { toast.error('Delete failed'); }
  };

  const selStudent = students.find(s => String(s.id) === String(studentId));
  const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <Sel label="Class" value={classId} onChange={v => { setClassId(v); setStudentId(''); }} className="w-48">
            <option value="">— Select Class —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>)}
          </Sel>
          <Sel label="Student" value={studentId} onChange={setStudentId} className="w-64">
            <option value="">— Select Student —</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}{s.roll_number ? ` (${s.roll_number})` : ''}</option>)}
          </Sel>
          {studentId && (
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
              style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)' }}>
              <Plus size={14} /> Add Concession
            </button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl px-4 py-3 text-xs text-indigo-700 dark:text-indigo-300">
        Concessions are auto-applied as <strong>discount_amount</strong> when monthly invoices are generated for a student.
        Fixed = flat PKR deduction · Percent = % of total or specific fee head.
      </div>

      {!studentId ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-sm">
          <Tag size={28} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 font-medium">Select a class and student to manage their concessions</p>
        </div>
      ) : loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 flex items-center justify-center shadow-sm">
          <div className="w-8 h-8 border-2 border-t-emerald-600 border-emerald-200 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {selStudent?.full_name} — {items.length} concession{items.length !== 1 ? 's' : ''}
            </span>
          </div>
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <Tag size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">No concessions for this student</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  {['Fee Head','Type','Discount','Reason','Status',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{c.fee_head_name || <span className="text-slate-400 italic">All fees</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.discount_type === 'fixed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'}`}>
                        {c.discount_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">
                      {c.discount_type === 'fixed' ? `PKR ${fmt(c.discount_value)}` : `${c.discount_value}%`}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{c.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                          <Pencil size={13} />
                        </button>
                        {delId === c.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(c.id)} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold">Yes</button>
                            <button onClick={() => setDelId(null)} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDelId(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)' }}>
                  <Tag size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{form.id ? 'Edit' : 'Add'} Concession</h2>
                  <p className="text-xs text-slate-400">{selStudent?.full_name}</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Applies To (leave blank for all fees)</label>
                <div className="relative">
                  <select value={form.fee_head_id} onChange={e => setForm(f => ({ ...f, fee_head_id: e.target.value }))} className={inp}>
                    <option value="">— All Fees (total invoice) —</option>
                    {feeHeads.filter(h => h.category === 'monthly').map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Discount Type *</label>
                  <div className="relative">
                    <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} className={inp}>
                      <option value="fixed">Fixed (PKR)</option>
                      <option value="percent">Percent (%)</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Value * {form.discount_type === 'percent' ? '(%)' : '(PKR)'}
                  </label>
                  <input type="number" min="0.01" step="0.01" value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={form.discount_type === 'percent' ? 'e.g. 10' : 'e.g. 500'}
                    className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Reason</label>
                <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Staff child, Sibling discount, Merit scholarship…"
                  className={inp} />
              </div>
              {form.id && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600" />
                  <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">Active</label>
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)' }}>
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                {form.id ? 'Update' : 'Add Concession'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Fee Setup ────────────────────────────────────────────
function SetupTab({ classes }) {
  const [heads,      setHeads]      = useState([]);
  const [structures, setStructures] = useState([]);
  const [selClass,   setSelClass]   = useState('');
  const [selYear,    setSelYear]    = useState('2024-25');

  const [headForm,   setHeadForm]   = useState({ name: '', category: 'monthly', description: '' });
  const [structForm, setStructForm] = useState({ fee_head_id: '', amount: '' });
  const [editHead,   setEditHead]   = useState(null);
  const [saving,     setSaving]     = useState(false);

  const loadHeads = useCallback(async () => {
    const r = await getFeeHeads();
    setHeads(Array.isArray(r.data) ? r.data : []);
  }, []);

  const loadStructures = useCallback(async () => {
    if (!selClass) return;
    const r = await getFeeStructures({ class_id: selClass, academic_year: selYear });
    setStructures(Array.isArray(r.data) ? r.data : []);
  }, [selClass, selYear]);

  useEffect(() => { loadHeads(); }, [loadHeads]);
  useEffect(() => { loadStructures(); }, [loadStructures]);

  const handleSaveHead = async () => {
    if (!headForm.name || !headForm.category) { toast.error('Name and category required'); return; }
    setSaving(true);
    try {
      if (editHead) await updateFeeHead(editHead.id, { ...editHead, ...headForm });
      else          await createFeeHead(headForm);
      toast.success(editHead ? 'Updated' : 'Fee head created');
      setHeadForm({ name: '', category: 'monthly', description: '' });
      setEditHead(null);
      loadHeads();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteHead = async (id) => {
    if (!window.confirm('Delete this fee head?')) return;
    try { await deleteFeeHead(id); toast.success('Deleted'); loadHeads(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleSaveStructure = async () => {
    if (!structForm.fee_head_id || !structForm.amount) { toast.error('Fee head and amount required'); return; }
    if (!selClass) { toast.error('Select a class first'); return; }
    setSaving(true);
    try {
      await upsertFeeStructure({ fee_head_id: structForm.fee_head_id, class_id: selClass, amount: structForm.amount, academic_year: selYear });
      toast.success('Fee structure saved');
      setStructForm({ fee_head_id: '', amount: '' });
      loadStructures();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteStructure = async (id) => {
    try { await deleteFeeStructure(id); toast.success('Removed'); loadStructures(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Fee Heads */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Layers size={16} className="text-indigo-500" />Fee Heads</h2>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          {/* Form */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={editHead ? headForm.name || editHead.name : headForm.name} onChange={v => setHeadForm(f => ({ ...f, name: v }))} placeholder="e.g. Tuition Fee" />
            <Sel label="Category" value={editHead ? headForm.category || editHead.category : headForm.category} onChange={v => setHeadForm(f => ({ ...f, category: v }))}>
              {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Sel>
          </div>
          <div className="flex gap-2">
            {editHead && <button onClick={() => { setEditHead(null); setHeadForm({ name: '', category: 'monthly', description: '' }); }} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-sm"><X size={14} /></button>}
            <button onClick={handleSaveHead} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Plus size={14} /> {editHead ? 'Update' : 'Add Fee Head'}
            </button>
          </div>
          {/* List */}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {heads.map(h => {
              const cat = CAT_COLORS[h.category] || CAT_COLORS.one_time;
              return (
                <div key={h.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border" style={{ background: cat.bg, color: cat.text, borderColor: cat.border }}>{CATEGORIES[h.category]}</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{h.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditHead(h); setHeadForm({ name: h.name, category: h.category, description: h.description || '' }); }}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => handleDeleteHead(h.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fee Structures */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Settings2 size={16} className="text-emerald-500" />Fee Structures</h2>
          <button
            onClick={() => {
              const p = new URLSearchParams({ year: selYear, ...(selClass ? { class_id: selClass } : {}) });
              window.open(`/fees/structure/print?${p}`, '_blank');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            <Printer size={13} /> Print Structure
          </button>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Class *" value={selClass} onChange={setSelClass}>
              <option value="">— Select class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Sel>
            <Sel label="Academic Year" value={selYear} onChange={setSelYear}>
              {['2023-24','2024-25','2025-26','2026-27'].map(y => <option key={y} value={y}>{y}</option>)}
            </Sel>
          </div>

          {selClass && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Sel label="Fee Head" value={structForm.fee_head_id} onChange={v => setStructForm(f => ({ ...f, fee_head_id: v }))}>
                  <option value="">— Select fee head —</option>
                  {heads.map(h => <option key={h.id} value={h.id}>{h.name} ({CATEGORIES[h.category]})</option>)}
                </Sel>
                <Input label="Amount (Rs.)" type="number" value={structForm.amount} onChange={v => setStructForm(f => ({ ...f, amount: v }))} placeholder="e.g. 3000" />
              </div>
              <button onClick={handleSaveStructure} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
                <Plus size={14} /> Add / Update Amount
              </button>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {structures.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No fee structure defined for this class yet</p>
                ) : structures.map(s => {
                  const cat = CAT_COLORS[s.category] || CAT_COLORS.one_time;
                  return (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border" style={{ background: cat.bg, color: cat.text, borderColor: cat.border }}>{CATEGORIES[s.category]}</span>
                        <span className="text-sm text-slate-700 dark:text-slate-200">{s.fee_head_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Rs. {fmt(s.amount)}</span>
                        <button onClick={() => handleDeleteStructure(s.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Reports ───────────────────────────────────────────────
function ReportsTab({ classes }) {
  const [monthFrom, setMonthFrom] = useState(currentMonth());
  const [monthTo,   setMonthTo]   = useState(currentMonth());
  const [classId,   setClassId]   = useState('');
  const [summary,   setSummary]   = useState([]);
  const [outstanding, setOut]     = useState([]);
  const [tab,       setTab]       = useState('monthly');
  const [loading,   setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, oRes] = await Promise.all([
        getMonthlySummary({ month_from: monthFrom, month_to: monthTo, ...(classId ? { class_id: classId } : {}) }),
        getOutstandingBalances({ ...(classId ? { class_id: classId } : {}) }),
      ]);
      setSummary(Array.isArray(sRes.data) ? sRes.data : []);
      setOut(Array.isArray(oRes.data) ? oRes.data : []);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  }, [monthFrom, monthTo, classId]);

  useEffect(() => { load(); }, [load]);

  const handleExportSummary = async () => {
    try {
      const res = await getExportURL({ billing_month: monthFrom, ...(classId ? { class_id: classId } : {}) });
      downloadBlob(res.data, `fees_summary_${monthFrom || 'all'}.csv`);
    } catch { toast.error('Export failed'); }
  };

  const totalBilled    = summary.reduce((a, r) => a + parseFloat(r.total_billed    || 0), 0);
  const totalCollected = summary.reduce((a, r) => a + parseFloat(r.total_collected || 0), 0);
  const totalPending   = summary.reduce((a, r) => a + parseFloat(r.total_pending   || 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">From Month</label>
            <input type="month" value={monthFrom} onChange={e => setMonthFrom(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">To Month</label>
            <input type="month" value={monthTo} onChange={e => setMonthTo(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          </div>
          <Sel label="Class" value={classId} onChange={setClassId} className="w-44">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel>
          <div className="flex items-end gap-2">
            <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExportSummary}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-md"
              style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary totals */}
      {summary.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[['Total Billed', totalBilled, '#6366f1'], ['Collected', totalCollected, '#16a34a'], ['Pending', totalPending, '#dc2626']].map(([l, v, c]) => (
            <div key={l} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="text-xs text-slate-400 mb-1">{l}</div>
              <div className="text-2xl font-bold" style={{ color: c }}>Rs. {fmt(v)}</div>
              {l === 'Collected' && totalBilled > 0 && (
                <div className="text-xs text-slate-400 mt-1">{Math.round((totalCollected/totalBilled)*100)}% collection rate</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[['monthly','Monthly Summary'],['outstanding','Outstanding Balances']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === k ? 'text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            style={tab === k ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 flex items-center justify-center shadow-sm">
          <div className="w-8 h-8 border-2 border-t-emerald-600 border-emerald-200 rounded-full animate-spin" />
        </div>
      ) : tab === 'monthly' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {summary.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No data for selected period</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  {['Month','Invoices','Paid','Partial','Unpaid','Billed','Collected','Pending','Collection %'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.map((r, i) => {
                  const pct = r.total_billed > 0 ? Math.round((r.total_collected / r.total_billed) * 100) : 0;
                  return (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{r.billing_month}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.total_invoices}</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold">{r.paid_count}</td>
                      <td className="px-4 py-3 text-amber-600 font-semibold">{r.partial_count}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">{r.unpaid_count}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">Rs. {fmt(r.total_billed)}</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold">Rs. {fmt(r.total_collected)}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">Rs. {fmt(r.total_pending)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626' }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {outstanding.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{outstanding.length} student{outstanding.length !== 1 ? 's' : ''} with outstanding balance</span>
              <button
                onClick={() => {
                  const p = new URLSearchParams();
                  if (classId) { p.set('class_id', classId); }
                  window.open(`/fees/defaulters/print?${p}`, '_blank');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
                <Printer size={12} /> Print Defaulters List
              </button>
            </div>
          )}
          {outstanding.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
              <p className="font-semibold text-slate-500 dark:text-slate-400">No outstanding balances!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  {['Student','Class','Invoices','Total Billed','Total Paid','Outstanding'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outstanding.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{r.full_name}</div>
                      {r.roll_number && <div className="text-xs text-slate-400">Roll: {r.roll_number}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{r.class_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.invoices}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Rs. {fmt(r.total_billed)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">Rs. {fmt(r.total_paid)}</td>
                    <td className="px-4 py-3 font-bold text-red-600">Rs. {fmt(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function FeesPage() {
  const [tab,              setTab]             = useState('invoices');
  const [classes,          setClasses]         = useState([]);
  const [feeHeads,         setFeeHeads]        = useState([]);
  const [stats,            setStats]           = useState(null);
  const [sendingReminders, setSendingReminders]= useState(false);

  useEffect(() => {
    getClasses().then(r => setClasses(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    getFeeHeads().then(r => setFeeHeads(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    getDashboardStats().then(r => setStats(r.data?.data ?? r.data)).catch(() => {});
  }, []);

  const handleSendReminders = async () => {
    if (!window.confirm('Send fee reminders (email + SMS) to all parents with overdue or due-soon invoices?\n\nEach invoice will only be reminded once per day.')) return;
    setSendingReminders(true);
    try {
      const { data } = await sendFeeReminders({ channel: 'both', status: 'both' });
      toast.success(`Reminders sent — ${data.emailsSent} email(s), ${data.smsSent} SMS (${data.skipped} skipped)`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const TABS = [
    { key: 'invoices',    label: 'Invoices',     icon: ReceiptText  },
    { key: 'generate',    label: 'Generate',     icon: CalendarDays },
    { key: 'concessions', label: 'Concessions',  icon: Tag          },
    { key: 'setup',       label: 'Fee Setup',    icon: Settings2    },
    { key: 'reports',     label: 'Reports',      icon: BarChart3    },
  ];

  return (
    <Layout>
      {/* ── Hero ─────────────────────────────────────── */}
      <div className="sticky top-14 lg:top-0 z-30 px-4 sm:px-6 lg:px-8 py-5"
        style={{ background: 'linear-gradient(135deg,#052e16 0%,#065f46 50%,#047857 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}>
                <Banknote size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Fee Management</h1>
                <p className="text-xs text-emerald-300 mt-0.5">Invoices · Payments · Reports</p>
              </div>
            </div>

            {/* Quick stats */}
            {stats && (
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { l: 'Collected',  v: `Rs.${fmt(stats.collected_this_month||0)}`, color: '#34d399' },
                  { l: 'Pending',    v: `Rs.${fmt(stats.total_pending||0)}`,        color: '#fbbf24' },
                  { l: 'Overdue',    v: stats.overdue_count || 0,                   color: '#f87171' },
                ].map(({ l, v, color }) => (
                  <div key={l} className="text-center px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                    <div className="text-base font-bold" style={{ color }}>{v}</div>
                    <div className="text-xs text-emerald-300">{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Send Reminders */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleSendReminders}
              disabled={sendingReminders}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all disabled:opacity-50 backdrop-blur-sm">
              {sendingReminders
                ? <><Loader2 size={12} className="animate-spin" /> Sending…</>
                : <><Mail size={12} /> Send Fee Reminders</>}
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-white/10 rounded-2xl p-1 backdrop-blur-sm w-fit">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === key ? 'bg-white text-slate-800 shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}>
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tab === 'invoices'    && <InvoicesTab    classes={classes} feeHeads={feeHeads} />}
        {tab === 'generate'    && <GenerateTab    classes={classes} />}
        {tab === 'concessions' && <ConcessionsTab classes={classes} feeHeads={feeHeads} />}
        {tab === 'setup'       && <SetupTab       classes={classes} />}
        {tab === 'reports'     && <ReportsTab     classes={classes} />}
      </div>
    </Layout>
  );
}
