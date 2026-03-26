import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Bus, MapPin, Users, PlusCircle, Pencil, Trash2,
  Search, RefreshCw, X, ChevronDown, ChevronRight,
  Navigation, Clock, Phone, UserCheck, AlertCircle,
  CheckCircle2, Wrench, BarChart3, Route,
} from 'lucide-react';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import TabBar     from '../components/ui/TabBar';
import StatCard   from '../components/ui/StatCard';
import {
  getTransportSummary, getStudentsWithoutTransport,
  getBuses, createBus, updateBus, deleteBus,
  getRoutes, createRoute, updateRoute, deleteRoute,
  getStops, addStop, deleteStop,
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
} from '../api/transport';

// ── Helpers ──────────────────────────────────────────────────────────────────
const BUS_STATUS_STYLES = {
  active:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactive:    'bg-slate-100   text-slate-600   dark:bg-slate-700      dark:text-slate-400',
  maintenance: 'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-400',
};
const BUS_STATUS_ICONS = { active: CheckCircle2, inactive: AlertCircle, maintenance: Wrench };

const ASSIGN_STATUS_STYLES = {
  active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactive:  'bg-slate-100   text-slate-600   dark:bg-slate-700      dark:text-slate-400',
  suspended: 'bg-red-100     text-red-700     dark:bg-red-900/30     dark:text-red-400',
};

const TRANSPORT_TABS = [
  { id: 'overview',     label: 'Overview',     icon: BarChart3  },
  { id: 'buses',        label: 'Buses',        icon: Bus        },
  { id: 'routes',       label: 'Routes',       icon: Route      },
  { id: 'assignments',  label: 'Assignments',  icon: UserCheck  },
];

// ── Small shared components ───────────────────────────────────────────────────


function OccupancyBar({ bus_number, driver_name, route_name, assigned_students, capacity, occupancy_pct, bus_status }) {
  const pct   = Number(occupancy_pct) || 0;
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
  const Icon  = BUS_STATUS_ICONS[bus_status] || CheckCircle2;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${BUS_STATUS_STYLES[bus_status]}`}>
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{bus_number}</span>
            {route_name && <span className="text-xs text-slate-400 truncate hidden sm:inline">{route_name}</span>}
          </div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0 ml-2">
            {assigned_students}/{capacity}
          </span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
        </div>
        <div className="flex justify-between mt-0.5">
          {driver_name && <span className="text-[11px] text-slate-400">{driver_name}</span>}
          <span className="text-[11px] text-slate-400 ml-auto">{pct}% full</span>
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, children, required }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <div className="relative">
        <select value={value} onChange={onChange} required={required}
          className="w-full appearance-none pl-3 pr-8 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent">
          {children}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, required, min, max }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} min={min} max={max}
        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDelete({ title, detail, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">{detail}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── BUS MODAL ────────────────────────────────────────────────────────────────
function BusModal({ bus, onSave, onClose }) {
  const isEdit = Boolean(bus?.id);
  const [form, setForm] = useState({
    bus_number:       bus?.bus_number       ?? '',
    vehicle_number:   bus?.vehicle_number   ?? '',
    capacity:         bus?.capacity         ?? '',
    make_model:       bus?.make_model        ?? '',
    manufacture_year: bus?.manufacture_year ?? '',
    driver_name:      bus?.driver_name      ?? '',
    driver_phone:     bus?.driver_phone     ?? '',
    driver_license:   bus?.driver_license   ?? '',
    status:           bus?.status           ?? 'active',
    notes:            bus?.notes            ?? '',
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <ModalShell title={isEdit ? 'Edit Bus' : 'Add New Bus'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Bus Number" value={form.bus_number} onChange={set('bus_number')} placeholder="Bus-01" required />
          <InputField label="Vehicle Reg. No." value={form.vehicle_number} onChange={set('vehicle_number')} placeholder="LEA-1234" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Seating Capacity" type="number" value={form.capacity} onChange={set('capacity')} placeholder="35" required min="1" />
          <SelectField label="Status" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </SelectField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Make / Model" value={form.make_model} onChange={set('make_model')} placeholder="Toyota Coaster" />
          <InputField label="Year" type="number" value={form.manufacture_year} onChange={set('manufacture_year')} placeholder="2020" min="1980" max="2100" />
        </div>
        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Driver Info</p>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Driver Name" value={form.driver_name} onChange={set('driver_name')} placeholder="Muhammad Arif" />
            <InputField label="Driver Phone" value={form.driver_phone} onChange={set('driver_phone')} placeholder="0300-0000000" />
          </div>
          <div className="mt-3">
            <InputField label="License Number" value={form.driver_license} onChange={set('driver_license')} placeholder="Optional" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2}
            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-sky-500 resize-none"
            placeholder="Optional notes…" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
          <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow hover:opacity-90">
            {isEdit ? 'Save Changes' : 'Add Bus'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── ROUTE MODAL ──────────────────────────────────────────────────────────────
function RouteModal({ route, onSave, onClose }) {
  const isEdit = Boolean(route?.id);
  const [form, setForm] = useState({
    route_name:     route?.route_name     ?? '',
    description:    route?.description    ?? '',
    start_point:    route?.start_point    ?? '',
    end_point:      route?.end_point      ?? '',
    estimated_time: route?.estimated_time ?? '',
    distance_km:    route?.distance_km    ?? '',
    is_active:      route?.is_active      ?? true,
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <ModalShell title={isEdit ? 'Edit Route' : 'Add New Route'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
        <InputField label="Route Name" value={form.route_name} onChange={set('route_name')} placeholder="Route 1 – City Center" required />
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Start Point" value={form.start_point} onChange={set('start_point')} placeholder="School Main Gate" required />
          <InputField label="End Point" value={form.end_point} onChange={set('end_point')} placeholder="City Center Chowk" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Est. Time (min)" type="number" value={form.estimated_time} onChange={set('estimated_time')} placeholder="25" min="1" />
          <InputField label="Distance (km)" type="number" value={form.distance_km} onChange={set('distance_km')} placeholder="8.5" min="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
          <textarea value={form.description} onChange={set('description')} rows={2}
            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-sky-500 resize-none"
            placeholder="Optional description…" />
        </div>
        {isEdit && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded text-sky-600" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
          </label>
        )}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
          <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow hover:opacity-90">
            {isEdit ? 'Save Changes' : 'Add Route'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── STOP MODAL ───────────────────────────────────────────────────────────────
function StopModal({ routeId, stop, onSave, onClose }) {
  const [form, setForm] = useState({
    stop_name:    stop?.stop_name    ?? '',
    stop_order:   stop?.stop_order   ?? '',
    pickup_time:  stop?.pickup_time  ?? '',
    dropoff_time: stop?.dropoff_time ?? '',
    landmark:     stop?.landmark     ?? '',
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <ModalShell title={stop?.id ? 'Edit Stop' : 'Add Stop'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave(routeId, form); }} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Stop Name" value={form.stop_name} onChange={set('stop_name')} placeholder="City Center Chowk" required />
          <InputField label="Order" type="number" value={form.stop_order} onChange={set('stop_order')} placeholder="1" required min="1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Pickup Time" type="time" value={form.pickup_time} onChange={set('pickup_time')} />
          <InputField label="Dropoff Time" type="time" value={form.dropoff_time} onChange={set('dropoff_time')} />
        </div>
        <InputField label="Landmark / Description" value={form.landmark} onChange={set('landmark')} placeholder="Near MCB Bank" />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
          <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow hover:opacity-90">
            {stop?.id ? 'Save' : 'Add Stop'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── ASSIGNMENT MODAL ─────────────────────────────────────────────────────────
function AssignModal({ assignment, buses, routes, onSave, onClose }) {
  const isEdit = Boolean(assignment?.id);
  const [form, setForm] = useState({
    student_id:      '',
    route_id:        assignment?.route_id   ?? '',
    stop_id:         assignment?.stop_id    ?? '',
    bus_id:          assignment?.bus_id     ?? '',
    academic_year:   '2024-25',
    transport_type:  assignment?.transport_type ?? 'both',
    monthly_fee:     assignment?.monthly_fee    ?? '1500',
  });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const [stops, setStops]       = useState([]);
  const [students, setStudents] = useState([]);
  const [stuSearch, setStuSearch] = useState('');

  useEffect(() => {
    if (form.route_id) {
      getStops(form.route_id).then(r => setStops(r.data || [])).catch(() => {});
    } else {
      setStops([]);
    }
  }, [form.route_id]);

  useEffect(() => {
    if (!isEdit) {
      getStudentsWithoutTransport({ search: stuSearch }).then(r => setStudents(r.data || [])).catch(() => {});
    }
  }, [stuSearch, isEdit]);

  return (
    <ModalShell title={isEdit ? 'Edit Assignment' : 'Assign Student to Transport'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Student <span className="text-red-500">*</span></label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={stuSearch} onChange={e => setStuSearch(e.target.value)} placeholder="Search student by name or roll no…"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500" />
            </div>
            <div className="relative">
              <select value={form.student_id} onChange={set('student_id')} required
                className="w-full appearance-none pl-3 pr-8 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-sky-500">
                <option value="">Select student…</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.student_name} — {s.roll_number} ({s.class_section})</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Route" value={form.route_id} onChange={set('route_id')} required>
            <option value="">Select route…</option>
            {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
          </SelectField>
          <SelectField label="Bus" value={form.bus_id} onChange={set('bus_id')} required>
            <option value="">Select bus…</option>
            {buses.filter(b => b.status === 'active').map(b => (
              <option key={b.id} value={b.id}>{b.bus_number} (cap: {b.capacity})</option>
            ))}
          </SelectField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Pickup Stop" value={form.stop_id} onChange={set('stop_id')}>
            <option value="">No specific stop</option>
            {stops.map(s => <option key={s.id} value={s.id}>{s.stop_name}</option>)}
          </SelectField>
          <SelectField label="Transport Type" value={form.transport_type} onChange={set('transport_type')}>
            <option value="both">Both Ways</option>
            <option value="pickup">Pickup Only</option>
            <option value="dropoff">Dropoff Only</option>
          </SelectField>
        </div>

        <InputField label="Monthly Fee (PKR)" type="number" value={form.monthly_fee} onChange={set('monthly_fee')} placeholder="1500" min="0" />

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
          <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow hover:opacity-90">
            {isEdit ? 'Update' : 'Assign'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── ROUTE DETAIL PANEL (stops list) ─────────────────────────────────────────
function RouteDetailPanel({ route, buses, onClose, onRefresh }) {
  const [stops, setStops]       = useState([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [stopModal, setStopModal]  = useState(false);
  const [deleteStop_, setDeleteStop_] = useState(null);

  const load = useCallback(async () => {
    setLoadingStops(true);
    try {
      const r = await getStops(route.id);
      setStops(r.data || []);
    } catch { /* ignore */ }
    finally { setLoadingStops(false); }
  }, [route.id]);

  useEffect(() => { load(); }, [load]);

  const handleAddStop = async (routeId, form) => {
    try {
      await addStop(routeId, form);
      toast.success('Stop added');
      setStopModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add stop'); }
  };

  const handleDeleteStop = async () => {
    try {
      await deleteStop(deleteStop_.id);
      toast.success('Stop removed');
      setDeleteStop_(null);
      load();
    } catch { toast.error('Failed to delete stop'); }
  };

  const assignedBus = buses.find(b => b.id === route.bus_id);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">{route.route_name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Navigation size={12} /> {route.start_point} → {route.end_point}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 flex-shrink-0">
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
            {route.estimated_time && (
              <span className="flex items-center gap-1"><Clock size={11} />{route.estimated_time} min</span>
            )}
            <span className="flex items-center gap-1"><Users size={11} />{route.assigned_students || 0} students</span>
            {assignedBus && (
              <span className="flex items-center gap-1"><Bus size={11} />{assignedBus.bus_number}</span>
            )}
          </div>
        </div>

        {/* Stops */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Route Stops ({stops.length})</p>
            <button onClick={() => setStopModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700">
              <PlusCircle size={12} /> Add Stop
            </button>
          </div>

          {loadingStops ? (
            <div className="flex items-center gap-2 py-8 justify-center text-slate-400">
              <RefreshCw size={16} className="animate-spin" /> Loading…
            </div>
          ) : stops.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <MapPin size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No stops defined yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-600" />
              <div className="space-y-1">
                {stops.map((s, i) => (
                  <div key={s.id} className="flex items-start gap-4 pl-8 relative py-2">
                    {/* Dot */}
                    <div className={`absolute left-1.5 top-3 w-4 h-4 rounded-full border-2 flex-shrink-0 z-10 ${
                      i === 0 ? 'border-sky-500 bg-sky-500' :
                      i === stops.length - 1 ? 'border-emerald-500 bg-emerald-500' :
                      'border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm text-slate-800 dark:text-white">{s.stop_name}</p>
                          {s.landmark && <p className="text-xs text-slate-400">{s.landmark}</p>}
                          <div className="flex gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {s.pickup_time  && <span>↑ {s.pickup_time?.slice(0,5)}</span>}
                            {s.dropoff_time && <span>↓ {s.dropoff_time?.slice(0,5)}</span>}
                            {s.student_count > 0 && <span className="text-sky-600 font-medium">{s.student_count} student{s.student_count !== 1 ? 's' : ''}</span>}
                          </div>
                        </div>
                        <button onClick={() => setDeleteStop_(s)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 flex-shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {stopModal && (
        <StopModal routeId={route.id} onSave={handleAddStop} onClose={() => setStopModal(false)} />
      )}
      {deleteStop_ && (
        <ConfirmDelete
          title="Remove Stop"
          detail={`Remove stop "${deleteStop_.stop_name}"?`}
          onConfirm={handleDeleteStop}
          onClose={() => setDeleteStop_(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function TransportPage() {
  const [tab, setTab] = useState('overview');

  const [summary,     setSummary]     = useState(null);
  const [buses,       setBuses]       = useState([]);
  const [routes,      setRoutes]      = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(false);

  // Filters
  const [assignFilter, setAssignFilter] = useState({ route_id: '', bus_id: '', search: '' });

  // Modals
  const [busModal,    setBusModal]    = useState(null);
  const [routeModal,  setRouteModal]  = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, item }
  const [detailRoute, setDetailRoute]   = useState(null);

  // ── Loaders ──────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    try {
      const r = await getTransportSummary();
      setSummary(r.data?.data ?? r.data);
    } catch { /* silent */ }
  }, []);

  const loadBuses = useCallback(async () => {
    try {
      const r = await getBuses();
      setBuses(r.data || []);
    } catch { toast.error('Failed to load buses'); }
  }, []);

  const loadRoutes = useCallback(async () => {
    try {
      const r = await getRoutes();
      setRoutes(r.data || []);
    } catch { toast.error('Failed to load routes'); }
  }, []);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        route_id: assignFilter.route_id || undefined,
        bus_id:   assignFilter.bus_id   || undefined,
        search:   assignFilter.search   || undefined,
      };
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
      const r = await getAssignments(params);
      setAssignments(r.data || []);
    } catch { toast.error('Failed to load assignments'); }
    finally { setLoading(false); }
  }, [assignFilter]);

  useEffect(() => { loadSummary(); loadBuses(); loadRoutes(); }, [loadSummary, loadBuses, loadRoutes]);
  useEffect(() => { if (tab === 'assignments') loadAssignments(); }, [tab, loadAssignments]);

  // ── Bus actions ──────────────────────────────────────────
  const handleSaveBus = async (form) => {
    try {
      if (busModal?.id) { await updateBus(busModal.id, form); toast.success('Bus updated'); }
      else              { await createBus(form);              toast.success('Bus added');   }
      setBusModal(null); loadBuses(); loadSummary();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save bus'); }
  };

  const handleDeleteBus = async () => {
    try {
      await deleteBus(deleteTarget.item.id);
      toast.success('Bus deleted');
      setDeleteTarget(null); loadBuses(); loadSummary();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete bus'); }
  };

  // ── Route actions ────────────────────────────────────────
  const handleSaveRoute = async (form) => {
    try {
      if (routeModal?.id) { await updateRoute(routeModal.id, form); toast.success('Route updated'); }
      else                { await createRoute(form);                 toast.success('Route created'); }
      setRouteModal(null); loadRoutes(); loadSummary();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save route'); }
  };

  const handleDeleteRoute = async () => {
    try {
      await deleteRoute(deleteTarget.item.id);
      toast.success('Route deleted');
      setDeleteTarget(null); loadRoutes(); loadSummary();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete route'); }
  };

  // ── Assignment actions ───────────────────────────────────
  const handleSaveAssignment = async (form) => {
    try {
      if (assignModal?.id) { await updateAssignment(assignModal.id, form); toast.success('Assignment updated'); }
      else                 { await createAssignment(form);                  toast.success('Student assigned');  }
      setAssignModal(null); loadAssignments(); loadSummary();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save assignment'); }
  };

  const handleDeleteAssignment = async () => {
    try {
      await deleteAssignment(deleteTarget.item.id);
      toast.success('Assignment removed');
      setDeleteTarget(null); loadAssignments(); loadSummary();
    } catch { toast.error('Failed to remove assignment'); }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'bus')        handleDeleteBus();
    else if (deleteTarget.type === 'route') handleDeleteRoute();
    else                                    handleDeleteAssignment();
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <PageHeader
          icon={Bus}
          title="Transport Management"
          subtitle="Manage school buses, routes and student assignments"
          actions={
            <div className="flex gap-2 flex-wrap">
              {tab === 'buses'       && <button onClick={() => setBusModal('new')}    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"><PlusCircle size={16} /> Add Bus</button>}
              {tab === 'routes'      && <button onClick={() => setRouteModal('new')}  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"><PlusCircle size={16} /> Add Route</button>}
              {tab === 'assignments' && <button onClick={() => setAssignModal('new')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"><PlusCircle size={16} /> Assign Student</button>}
            </div>
          }
        />
        <div className="mt-5">
          <TabBar tabs={TRANSPORT_TABS} active={tab} onChange={setTab} />
        </div>
      </div>

      {/* ══ OVERVIEW ═══════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Buses"       value={summary?.buses?.total ?? 0}               sub={`${summary?.buses?.by_status?.active ?? 0} active`}           icon={Bus}       color="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" />
            <StatCard label="Active Routes"     value={summary?.routes?.total ?? 0}              sub="operational routes"                                           icon={Route}     color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
            <StatCard label="Students Assigned" value={summary?.assignments?.active ?? 0}        sub="active this year"                                             icon={Users}     color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
            <StatCard label="In Maintenance"    value={summary?.buses?.by_status?.maintenance ?? 0} sub="buses under service"                                       icon={Wrench}    color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
          </div>

          {/* Bus occupancy */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-5">Bus Occupancy</h3>
            {(summary?.occupancy ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No bus data yet</p>
            ) : (
              <div className="space-y-5">
                {(summary?.occupancy ?? []).map((b, i) => (
                  <OccupancyBar key={i} {...b} />
                ))}
              </div>
            )}
          </div>

          {/* Routes quick view */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-white">Routes Overview</h3>
              <button onClick={() => setTab('routes')} className="text-xs text-sky-600 dark:text-sky-400 font-medium hover:underline">View all →</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {routes.slice(0, 4).map(r => (
                <div key={r.id}
                  onClick={() => setDetailRoute(r)}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-800 cursor-pointer transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
                    <Route size={16} className="text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">{r.route_name}</p>
                    <p className="text-xs text-slate-400">{r.assigned_students} students · {r.total_stops} stops</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ BUSES ══════════════════════════════════════════════════ */}
      {tab === 'buses' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {buses.map(b => {
            const Icon = BUS_STATUS_ICONS[b.status] || CheckCircle2;
            const pct  = b.capacity > 0 ? Math.round((b.assigned_students / b.capacity) * 100) : 0;
            const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
            return (
              <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-4">
                {/* Title row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <Bus size={18} className="text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{b.bus_number}</p>
                      <p className="text-xs text-slate-400">{b.vehicle_number}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${BUS_STATUS_STYLES[b.status]}`}>
                    <Icon size={11} /> {b.status}
                  </span>
                </div>

                {/* Info */}
                {b.make_model && <p className="text-xs text-slate-500 dark:text-slate-400">{b.make_model} {b.manufacture_year ? `(${b.manufacture_year})` : ''}</p>}

                {b.route_name && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Route size={11} /> {b.route_name}
                  </div>
                )}

                {/* Driver */}
                {b.driver_name && (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                      <Users size={12} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{b.driver_name}</p>
                      {b.driver_phone && <p className="text-[11px] text-slate-400 flex items-center gap-1"><Phone size={9} /> {b.driver_phone}</p>}
                    </div>
                  </div>
                )}

                {/* Occupancy */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400">Occupancy</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{b.assigned_students}/{b.capacity}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setBusModal(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => setDeleteTarget({ type: 'bus', item: b })}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}

          {buses.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-400">
              <Bus size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No buses added yet</p>
              <button onClick={() => setBusModal('new')} className="mt-3 text-sm text-sky-600 dark:text-sky-400 hover:underline font-medium">+ Add your first bus</button>
            </div>
          )}
        </div>
      )}

      {/* ══ ROUTES ═════════════════════════════════════════════════ */}
      {tab === 'routes' && (
        <div className="space-y-3">
          {routes.map(r => (
            <div key={r.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 transition-all ${
                r.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-dashed border-slate-300 dark:border-slate-600 opacity-70'
              }`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <Route size={18} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-800 dark:text-white">{r.route_name}</h3>
                      {!r.is_active && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full font-medium">Inactive</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-medium text-slate-600 dark:text-slate-300">{r.start_point}</span>
                      <Navigation size={12} />
                      <span className="font-medium text-slate-600 dark:text-slate-300">{r.end_point}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-400">
                      {r.estimated_time && <span className="flex items-center gap-1"><Clock size={11} />{r.estimated_time} min</span>}
                      <span className="flex items-center gap-1"><MapPin size={11} />{r.total_stops} stops</span>
                      <span className="flex items-center gap-1"><Users size={11} />{r.assigned_students} students</span>
                      {r.bus_number && <span className="flex items-center gap-1"><Bus size={11} />{r.bus_number}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setDetailRoute(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-xs font-medium hover:bg-sky-100">
                    <MapPin size={12} /> Stops
                  </button>
                  <button onClick={() => setRouteModal(r)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTarget({ type: 'route', item: r })}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}

          {routes.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Route size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No routes defined yet</p>
              <button onClick={() => setRouteModal('new')} className="mt-3 text-sm text-sky-600 dark:text-sky-400 hover:underline font-medium">+ Add your first route</button>
            </div>
          )}
        </div>
      )}

      {/* ══ ASSIGNMENTS ════════════════════════════════════════════ */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={assignFilter.search}
                  onChange={e => setAssignFilter(p => ({ ...p, search: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && loadAssignments()}
                  placeholder="Search by name or roll no…"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="relative">
                <select value={assignFilter.route_id}
                  onChange={e => setAssignFilter(p => ({ ...p, route_id: e.target.value }))}
                  className="appearance-none pl-3 pr-7 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500">
                  <option value="">All Routes</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={assignFilter.bus_id}
                  onChange={e => setAssignFilter(p => ({ ...p, bus_id: e.target.value }))}
                  className="appearance-none pl-3 pr-7 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500">
                  <option value="">All Buses</option>
                  {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button onClick={loadAssignments}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-700">
                <Search size={14} /> Search
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-14 gap-2 text-slate-400">
                <RefreshCw size={18} className="animate-spin" /> Loading…
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-14 text-slate-400">
                <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No assignments found</p>
                <button onClick={() => setAssignModal('new')} className="mt-3 text-sm text-sky-600 dark:text-sky-400 hover:underline font-medium">+ Assign a student</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <th className="text-left px-6 py-3">Student</th>
                      <th className="text-left px-4 py-3">Class</th>
                      <th className="text-left px-4 py-3">Route</th>
                      <th className="text-left px-4 py-3">Bus / Driver</th>
                      <th className="text-left px-4 py-3">Stop</th>
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-center px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {assignments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-3">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">{a.student_name}</p>
                            <p className="text-xs text-slate-400">{a.roll_number}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{a.class_section}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{a.route_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-700 dark:text-slate-300">{a.bus_number}</p>
                            {a.driver_name && <p className="text-[11px] text-slate-400 flex items-center gap-1"><Phone size={9} />{a.driver_phone}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {a.stop_name || '—'}
                          {a.pickup_time && <span className="block text-[11px] text-slate-400">{a.pickup_time?.slice(0,5)}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 capitalize">{a.transport_type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${ASSIGN_STATUS_STYLES[a.status]}`}>{a.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setAssignModal(a)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteTarget({ type: 'assignment', item: a })}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────── */}
      {busModal    && <BusModal    bus={busModal === 'new' ? null : busModal}       onSave={handleSaveBus}        onClose={() => setBusModal(null)} />}
      {routeModal  && <RouteModal  route={routeModal === 'new' ? null : routeModal} onSave={handleSaveRoute}      onClose={() => setRouteModal(null)} />}
      {assignModal && <AssignModal assignment={assignModal === 'new' ? null : assignModal} buses={buses} routes={routes} onSave={handleSaveAssignment} onClose={() => setAssignModal(null)} />}

      {deleteTarget && (
        <ConfirmDelete
          title={`Delete ${deleteTarget.type === 'bus' ? 'Bus' : deleteTarget.type === 'route' ? 'Route' : 'Assignment'}`}
          detail={`Remove "${deleteTarget.item.bus_number || deleteTarget.item.route_name || deleteTarget.item.student_name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* Route detail slide-over */}
      {detailRoute && (
        <RouteDetailPanel
          route={detailRoute}
          buses={buses}
          onClose={() => setDetailRoute(null)}
          onRefresh={loadRoutes}
        />
      )}
    </Layout>
  );
}
