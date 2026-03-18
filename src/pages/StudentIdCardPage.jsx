import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getStudents } from '../api/students';


const CENTER = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif' };

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

const AVATAR_COLORS = [
  ['#4f46e5','#7c3aed'], ['#0891b2','#0e7490'], ['#059669','#047857'],
  ['#dc2626','#b91c1c'], ['#d97706','#b45309'], ['#7c3aed','#6d28d9'],
];
function avatarColor(id) { return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]; }

function IdCard({ s }) {
  const [c1, c2] = avatarColor(s.id);
  const bg = `linear-gradient(135deg, ${c1}, ${c2})`;

  return (
    <div className="id-card">
      {/* Top stripe */}
      <div className="id-top" style={{ background: bg }}>
        <div className="id-school-name">SCHOOL MANAGEMENT SYSTEM</div>
        <div className="id-school-sub">Student Identity Card</div>
      </div>

      {/* Avatar / Photo */}
      <div className="id-avatar-wrap">
        {s.photo_url
          ? <img src={s.photo_url} alt={s.full_name} className="id-avatar id-avatar-photo" />
          : <div className="id-avatar" style={{ background: bg }}>{initials(s.full_name)}</div>
        }
      </div>

      {/* Info */}
      <div className="id-body">
        <div className="id-name">{s.full_name}</div>
        {s.full_name_urdu && <div className="id-name-urdu">{s.full_name_urdu}</div>}
        <div className="id-class-badge" style={{ background: c1 + '18', color: c1, border: `1px solid ${c1}44` }}>
          {s.class_name || s.grade || '—'}{s.section ? ` – ${s.section}` : ''}
        </div>

        <div className="id-rows">
          <div className="id-row"><span className="id-lbl">Father</span><span className="id-val">{s.father_name || '—'}</span></div>
          <div className="id-row"><span className="id-lbl">Roll No</span><span className="id-val bold">{s.roll_number || '—'}</span></div>
          {s.b_form_no && <div className="id-row"><span className="id-lbl">B-Form</span><span className="id-val mono">{s.b_form_no}</span></div>}
          {s.blood_group && <div className="id-row"><span className="id-lbl">Blood</span><span className="id-val bold" style={{ color: '#dc2626' }}>{s.blood_group}</span></div>}
          {s.phone && <div className="id-row"><span className="id-lbl">Contact</span><span className="id-val">{s.phone}</span></div>}
        </div>
      </div>

      {/* Footer bar */}
      <div className="id-footer" style={{ background: bg }}>
        Academic Year 2024–25
      </div>
    </div>
  );
}

export default function StudentIdCardPage() {
  const [params] = useSearchParams();
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');
  const [students, setStudents] = useState([]);

  const classId  = params.get('class_id');
  const classNm  = params.get('class_name') || '';
  const idsParam = params.get('ids');   // comma-separated student ids

  useEffect(() => {
    async function load() {
      try {
        let query = {};
        if (classId)  query.class_id = classId;
        const r = await getStudents(query);
        let data = Array.isArray(r.data) ? r.data : [];
        if (idsParam) {
          const ids = idsParam.split(',').map(Number).filter(Boolean);
          data = data.filter(s => ids.includes(s.id));
        }
        setStudents(data);
      } catch {
        setError('Failed to load students. Please close and try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!loading && students.length > 0) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, students]);

  if (loading) return <div style={CENTER}>Loading ID cards…</div>;
  if (error)   return <div style={{ ...CENTER, color: '#dc2626' }}>{error}</div>;
  if (students.length === 0) return <div style={{ ...CENTER, color: '#64748b' }}>No students found.</div>;

  // Group into pages of 8
  const pages = [];
  for (let i = 0; i < students.length; i += 8) pages.push(students.slice(i, i + 8));

  const label = classNm ? `ID Cards — ${classNm}` : `ID Cards (${students.length})`;

  return (
    <>
      <div className="no-print toolbar">
        <div className="toolbar-info"><strong>{label}</strong> — {students.length} card{students.length !== 1 ? 's' : ''}</div>
        <button className="print-btn" onClick={() => window.print()}>🖨 Print</button>
        <button className="close-btn" onClick={() => window.close()}>✕ Close</button>
      </div>

      {pages.map((group, pi) => (
        <div key={pi} className="page">
          <div className="card-grid">
            {group.map(s => <IdCard key={s.id} s={s} />)}
          </div>
        </div>
      ))}

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; background: #f0f0f0; }

        /* ── Toolbar ── */
        .toolbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: #1e293b; color: #e2e8f0;
          padding: 10px 20px; display: flex; align-items: center; gap: 12px;
        }
        .toolbar-info { flex: 1; font-size: 13px; }
        .print-btn { background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 7px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .close-btn { background: #475569; color: #fff; border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; cursor: pointer; }

        /* ── Page ── */
        .page {
          width: 210mm; min-height: 297mm;
          margin: 52px auto 24px;
          background: #fff;
          box-shadow: 0 2px 20px rgba(0,0,0,0.12);
          padding: 10mm;
          display: flex; align-items: flex-start;
        }

        /* ── Grid: 2 × 4 ── */
        .card-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6mm;
        }

        /* ── ID Card ── */
        .id-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: #fff;
          box-shadow: 0 1px 6px rgba(0,0,0,0.08);
          position: relative;
        }

        /* Top stripe */
        .id-top {
          padding: 8px 10px 10px;
          text-align: center;
        }
        .id-school-name { color: #fff; font-size: 8px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
        .id-school-sub  { color: rgba(255,255,255,0.75); font-size: 6.5px; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 1px; }

        /* Avatar */
        .id-avatar-wrap { display: flex; justify-content: center; margin-top: -14px; z-index: 1; position: relative; }
        .id-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 13px; font-weight: 900;
          border: 2.5px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        }
        .id-avatar-photo {
          width: 36px; height: 36px; border-radius: 50%;
          object-fit: cover;
          border: 2.5px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        }

        /* Body */
        .id-body { padding: 5px 10px 6px; flex: 1; display: flex; flex-direction: column; gap: 4px; align-items: center; }
        .id-name { font-size: 10px; font-weight: 900; color: #0f172a; text-align: center; line-height: 1.2; }
        .id-name-urdu { font-size: 10px; color: #475569; text-align: center; direction: rtl; margin-top: 1px; }
        .id-class-badge { font-size: 7.5px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-top: 2px; }

        .id-rows { width: 100%; margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }
        .id-row { display: flex; gap: 4px; align-items: baseline; }
        .id-lbl { font-size: 7px; color: #94a3b8; min-width: 36px; flex-shrink: 0; }
        .id-val { font-size: 7.5px; color: #1e293b; flex: 1; }
        .id-val.bold { font-weight: 700; }
        .id-val.mono { font-family: monospace; font-size: 7px; }

        /* Footer */
        .id-footer {
          padding: 4px 8px;
          text-align: center;
          color: rgba(255,255,255,0.9);
          font-size: 6.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* ── Print ── */
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .page {
            margin: 0; box-shadow: none;
            page-break-after: always;
            width: 100%; min-height: auto;
          }
          .page:last-child { page-break-after: avoid; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>
    </>
  );
}
