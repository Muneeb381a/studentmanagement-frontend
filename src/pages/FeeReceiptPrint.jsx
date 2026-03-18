import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getReceiptPrint } from '../api/fees';

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
};
const fmtTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
};

const METHOD_LABELS = {
  cash: 'Cash', bank: 'Bank Transfer', online: 'Online', cheque: 'Cheque', dd: 'Demand Draft',
};

const PRINT_STYLES = `
  @media print {
    body { background: white !important; }
    .no-print { display: none !important; }
    .receipt-wrap { box-shadow: none !important; margin: 0 auto !important; }
    @page { margin: 8mm; size: 80mm auto; }
  }
`;

// ── Divider ──────────────────────────────────────────────────
function Dashes() {
  return <div className="border-t border-dashed border-slate-300 my-3" />;
}

function Row({ label, value, bold, highlight }) {
  return (
    <div className={`flex justify-between items-center py-0.5 text-sm ${bold ? 'font-bold' : ''} ${highlight ? 'text-emerald-700' : 'text-slate-700'}`}>
      <span className={bold ? '' : 'text-slate-500'}>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

export default function FeeReceiptPrint() {
  const { id }     = useParams();
  const navigate   = useNavigate();
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
    getReceiptPrint(id)
      .then(r => setData(r.data?.data ?? r.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load receipt'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading receipt…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center text-red-500">
        <AlertCircle size={40} className="mx-auto mb-3" />
        <p className="font-medium">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-slate-500 hover:underline">← Go back</button>
      </div>
    </div>
  );

  const r             = data;
  const paymentIndex  = (r.invoice_payments || []).findIndex(p => p.id === r.id) + 1;
  const totalPayments = (r.invoice_payments || []).length;
  const netAmt        = Number(r.net_amount  || 0);
  const balance       = Number(r.balance     || 0);
  const paidAmt       = Number(r.paid_amount || 0);
  const isPaid        = balance <= 0.01;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 flex flex-col items-center">
      {/* Toolbar */}
      <div className="no-print w-full max-w-sm mb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 shadow-sm">
          <ArrowLeft size={15} /> Back
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow hover:bg-emerald-700">
          <Printer size={15} /> Print
        </button>
      </div>

      {/* Receipt paper — narrow (thermal receipt style) */}
      <div className="receipt-wrap w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* ── TOP STRIPE ─────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg,#064e3b,#065f46)' }} className="text-white px-6 py-5 text-center">
          <p className="text-lg font-black tracking-tight">SchoolMS</p>
          <p className="text-emerald-300 text-xs">Excellence in Education</p>
          <div className="mt-3 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto">
            <CheckCircle2 size={26} className="text-white" />
          </div>
          <p className="text-white font-bold text-sm mt-2">PAYMENT RECEIPT</p>
        </div>

        <div className="px-6 py-5">
          {/* Receipt meta */}
          <div className="text-center mb-4">
            <p className="text-xl font-black font-mono text-emerald-700">{r.receipt_no}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {fmtDate(r.payment_date)} {r.created_at ? `• ${fmtTime(r.created_at)}` : ''}
            </p>
            {totalPayments > 1 && (
              <p className="text-xs text-slate-400 mt-0.5">
                Payment {paymentIndex} of {totalPayments} for this invoice
              </p>
            )}
          </div>

          <Dashes />

          {/* Student info */}
          <div className="mb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Student Details</p>
            <p className="font-bold text-slate-800">{r.student_name}</p>
            {r.father_name && <p className="text-xs text-slate-500">S/O: {r.father_name}</p>}
            <div className="mt-2 space-y-1">
              <Row label="Roll No." value={r.roll_number || '—'} />
              <Row label="Class" value={r.class_name || '—'} />
            </div>
          </div>

          <Dashes />

          {/* Invoice info */}
          <div className="mb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Invoice Details</p>
            <Row label="Invoice No."   value={r.invoice_no || '—'} />
            <Row label="Type"          value={r.invoice_type ? r.invoice_type.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()) : '—'} />
            {r.billing_month && <Row label="Billing Month" value={r.billing_month} />}
          </div>

          <Dashes />

          {/* Payment details */}
          <div className="mb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Details</p>
            <Row label="Payment Date"   value={fmtDate(r.payment_date)} />
            <Row label="Payment Method" value={METHOD_LABELS[r.payment_method] || r.payment_method} />
            {r.bank_name       && <Row label="Bank Name"    value={r.bank_name} />}
            {r.transaction_ref && <Row label="Ref / Txn ID" value={r.transaction_ref} />}
            {r.collector_name  && <Row label="Received By"  value={r.collector_name} />}
          </div>

          <Dashes />

          {/* Amount summary */}
          <div className="space-y-1">
            <Row label="Total Invoice"  value={`PKR ${fmt(netAmt)}`} />
            <Row label="Previously Paid"
              value={`PKR ${fmt(paidAmt - Number(r.amount))}`}
              highlight={false}
            />
          </div>

          {/* Big amount */}
          <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Amount Received</p>
            <p className="text-3xl font-black font-mono text-emerald-700 mt-1">PKR {fmt(r.amount)}</p>
          </div>

          {/* Balance */}
          <div className={`mt-3 rounded-xl p-3 text-center ${isPaid ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isPaid ? '✓ Invoice Fully Paid' : 'Remaining Balance'}
            </p>
            {!isPaid && (
              <p className="text-xl font-black font-mono text-amber-700 mt-1">PKR {fmt(balance)}</p>
            )}
          </div>

          {r.remarks && (
            <>
              <Dashes />
              <p className="text-xs text-slate-500 text-center italic">{r.remarks}</p>
            </>
          )}

          <Dashes />

          {/* Footer */}
          <div className="text-center text-[10px] text-slate-400 space-y-0.5">
            <p>Thank you for your payment!</p>
            <p>123 School Road, Lahore | +92-42-1234567</p>
            <p className="mt-2 font-mono text-[9px]">Generated: {new Date().toLocaleString('en-PK')}</p>
          </div>
        </div>
      </div>

      {/* All receipts for this invoice (screen only) */}
      {(r.invoice_payments || []).length > 1 && (
        <div className="no-print w-full max-w-sm mt-4 bg-white rounded-2xl shadow border border-slate-200 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">All Payments on {r.invoice_no}</p>
          <div className="space-y-2">
            {r.invoice_payments.map((p, i) => (
              <div key={p.id}
                className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg ${p.id === r.id ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
                <div>
                  <p className="font-mono text-xs text-emerald-700">{p.receipt_no}</p>
                  <p className="text-xs text-slate-400">{fmtDate(p.payment_date)} · {p.payment_method}</p>
                </div>
                <p className="font-bold font-mono text-slate-700">PKR {fmt(p.amount)}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-sm mt-3 pt-3 border-t border-slate-200">
            <span>Total Paid</span>
            <span className="font-mono text-emerald-700">PKR {fmt(paidAmt)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
