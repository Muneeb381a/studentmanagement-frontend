import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, AlertCircle } from 'lucide-react';
import { getInvoicePrint } from '../api/fees';

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
};
const fmtShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_LABEL = {
  paid:      { label: 'PAID',     color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  partial:   { label: 'PARTIAL',  color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  unpaid:    { label: 'UNPAID',   color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  overdue:   { label: 'OVERDUE',  color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe' },
  cancelled: { label: 'CANCELLED',color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
};

const METHOD_LABELS = {
  cash: 'Cash', bank: 'Bank Transfer', online: 'Online', cheque: 'Cheque', dd: 'Demand Draft',
};

// ── Print styles injected into head ──────────────────────────
const PRINT_STYLES = `
  @media print {
    body { background: white !important; }
    .no-print { display: none !important; }
    .print-page { box-shadow: none !important; margin: 0 !important; padding: 16mm 20mm !important; max-width: 100% !important; border-radius: 0 !important; }
    @page { margin: 0; size: A4; }
  }
`;

export default function FeeInvoicePrint() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PRINT_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    getInvoicePrint(id)
      .then(r => setData(r.data?.data ?? r.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading invoice…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-red-500">
        <AlertCircle size={40} className="mx-auto mb-3" />
        <p className="font-medium">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-slate-500 hover:underline">← Go back</button>
      </div>
    </div>
  );

  const { invoice, items, payments } = data;
  const status  = STATUS_LABEL[invoice.invoice_status || invoice.status] || STATUS_LABEL.unpaid;
  const netAmt  = Number(invoice.net_amount  || 0);
  const balance = Number(invoice.balance     || 0);
  const paidAmt = Number(invoice.paid_amount || 0);
  const disc    = Number(invoice.discount_amount || 0);
  const fine    = Number(invoice.fine_amount     || 0);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {/* Action toolbar */}
      <div className="no-print max-w-3xl mx-auto mb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 shadow-sm">
          <ArrowLeft size={15} /> Back
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow hover:bg-emerald-700">
          <Printer size={15} /> Print Invoice
        </button>
      </div>

      {/* Invoice paper */}
      <div className="print-page max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }} className="px-8 py-7 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">SchoolMS</h1>
              <p className="text-emerald-300 text-xs mt-0.5">Excellence in Education</p>
              <div className="mt-3 text-xs text-emerald-200 space-y-0.5">
                <p>123 School Road, Lahore, Pakistan</p>
                <p>Tel: +92-42-1234567 | info@schoolms.edu.pk</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold border mb-2"
                style={{ background: status.bg, color: status.color, borderColor: status.border }}>
                {status.label}
              </div>
              <p className="text-2xl font-black text-white">{invoice.invoice_no || `INV-${invoice.id}`}</p>
              <p className="text-emerald-300 text-xs mt-1 capitalize">
                {invoice.invoice_type} Fee Invoice
                {invoice.billing_month && ` — ${invoice.billing_month}`}
              </p>
              <p className="text-emerald-200 text-xs mt-0.5">Issued: {fmtDate(invoice.issued_at)}</p>
            </div>
          </div>
        </div>

        {/* ── STUDENT INFO ────────────────────────────────────── */}
        <div className="px-8 py-5 bg-emerald-50 border-b border-emerald-100">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Bill To</p>
              <p className="font-bold text-slate-800 text-lg leading-tight">{invoice.student_name}</p>
              {invoice.father_name && <p className="text-sm text-slate-600 mt-0.5">S/O: {invoice.father_name}</p>}
              {invoice.address && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{invoice.student_address}</p>}
              {invoice.student_phone && <p className="text-xs text-slate-500 mt-0.5">📞 {invoice.student_phone}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Roll Number</span>
                <span className="font-semibold text-slate-700">{invoice.roll_number || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Class</span>
                <span className="font-semibold text-slate-700">{invoice.class_name || '—'}</span>
              </div>
              {invoice.academic_year && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Academic Year</span>
                  <span className="font-semibold text-slate-700">{invoice.academic_year}</span>
                </div>
              )}
              {invoice.due_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Due Date</span>
                  <span className={`font-semibold ${new Date(invoice.due_date) < new Date() && balance > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {fmtDate(invoice.due_date)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── FEE BREAKDOWN TABLE ──────────────────────────────── */}
        <div className="px-8 py-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Fee Breakdown</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 rounded-lg">
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide rounded-l-lg">#</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide rounded-r-lg">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={`border-b border-slate-100 ${item.is_waived ? 'opacity-50' : ''}`}>
                  <td className="py-2.5 px-3 text-slate-400">{i + 1}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-slate-700">{item.description}</span>
                    {item.is_waived && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">Waived</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {item.is_waived ? <span className="line-through text-slate-400">PKR {fmt(item.amount)}</span> : `PKR ${fmt(item.amount)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals block */}
          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm text-slate-600 py-1">
                <span>Subtotal</span>
                <span className="font-mono">PKR {fmt(invoice.total_amount)}</span>
              </div>
              {disc > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 py-1">
                  <span>Discount</span>
                  <span className="font-mono">− PKR {fmt(disc)}</span>
                </div>
              )}
              {fine > 0 && (
                <div className="flex justify-between text-sm text-red-600 py-1">
                  <span>Late Fine</span>
                  <span className="font-mono">+ PKR {fmt(fine)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-2 text-base">
                <span>Net Payable</span>
                <span className="font-mono">PKR {fmt(netAmt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── PAYMENT HISTORY ──────────────────────────────────── */}
        {payments.length > 0 && (
          <div className="px-8 pb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Payment History</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Receipt No.</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Method</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-mono text-xs text-emerald-700">{p.receipt_no}</td>
                    <td className="py-2 px-3 text-slate-600">{fmtShort(p.payment_date)}</td>
                    <td className="py-2 px-3 text-slate-600 capitalize">{METHOD_LABELS[p.payment_method] || p.payment_method}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">PKR {fmt(p.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50">
                  <td colSpan={3} className="py-2 px-3 font-bold text-slate-700">Total Paid</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">PKR {fmt(paidAmt)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── BALANCE SUMMARY ──────────────────────────────────── */}
        <div className="px-8 pb-6">
          <div className={`rounded-xl p-4 border ${balance > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Outstanding Balance</p>
                <p className={`text-3xl font-black mt-1 font-mono ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  PKR {fmt(balance)}
                </p>
              </div>
              <div className="text-right text-sm text-slate-500 space-y-1">
                <p>Net Payable: <strong className="text-slate-700">PKR {fmt(netAmt)}</strong></p>
                <p>Amount Paid: <strong className="text-emerald-700">PKR {fmt(paidAmt)}</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="px-8 pb-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}

        {/* ── FOOTER ───────────────────────────────────────────── */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-end justify-between">
          <div className="text-xs text-slate-400 space-y-0.5">
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>For queries, contact the accounts office during school hours.</p>
          </div>
          <div className="text-right">
            <div className="w-32 border-t-2 border-slate-300 pt-1">
              <p className="text-[10px] text-slate-400">Authorised Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
