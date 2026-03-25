import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, X, Sun, Moon, ChevronRight, LogOut, ChevronDown, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS } from '../../constants';
import NotificationBell from './NotificationBell';

const ROLE_LINKS = {
  admin:   null,
  teacher: ['/teacher-dashboard', '/timetable', '/attendance', '/classes', '/students', '/subjects', '/online-classes', '/homework', '/exams', '/announcements', '/events', '/messaging', '/diary'],
  student: ['/student-dashboard', '/online-classes', '/messaging', '/diary'],
  parent:  ['/parent-dashboard', '/online-classes', '/messaging', '/diary'],
};

const ROLE_COLORS = {
  admin:   'linear-gradient(135deg, #6366f1, #8b5cf6)',
  teacher: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
  student: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
  parent:  'linear-gradient(135deg, #10b981, #34d399)',
};

// Paths that become submenu children under '/' for admin role
const ADMIN_SUBMENU_PATHS = new Set(['/teacher-dashboard', '/student-dashboard', '/parent-dashboard']);

const END_PATHS = new Set(['/', '/teacher-dashboard', '/student-dashboard', '/parent-dashboard']);

export default function Sidebar({ open, onClose, onSearch }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut }       = useAuth();
  const navigate                = useNavigate();
  const location                = useLocation();

  const allowedPaths = user ? ROLE_LINKS[user.role] : [];
  const flatLinks    = allowedPaths === null
    ? NAV_LINKS
    : NAV_LINKS.filter(l => allowedPaths.includes(l.to));

  // For admin: pull adminChild items out and nest them under '/'
  const isAdmin = user?.role === 'admin';
  const visibleLinks = isAdmin
    ? flatLinks
        .filter(l => !ADMIN_SUBMENU_PATHS.has(l.to))
        .map(l => l.to === '/'
          ? { ...l, children: flatLinks.filter(c => ADMIN_SUBMENU_PATHS.has(c.to)) }
          : l)
    : flatLinks;

  // Auto-expand Dashboard submenu if a child route is active
  const childActive = [...ADMIN_SUBMENU_PATHS].some(p => location.pathname.startsWith(p));
  const [dashOpen, setDashOpen] = useState(childActive);

  const handleSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  const showNotifications = user && (user.role === 'admin' || user.role === 'teacher');

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside className={[
        'fixed top-0 left-0 z-50 h-screen w-64 flex flex-col',
        'bg-slate-950 border-r border-slate-800/60',
        'transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>

        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <GraduationCap size={18} className="text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">SchoolMS</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Management System</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* User card */}
        {user && (
          <div className="px-4 py-3 border-b border-slate-800/60 shrink-0 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-extrabold text-sm shadow-md"
              style={{ background: ROLE_COLORS[user.role] || ROLE_COLORS.admin }}
            >
              {(user.name || 'U')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{user.role}</p>
            </div>
          </div>
        )}

        {/* Search trigger */}
        <div className="px-4 py-2.5 border-b border-slate-800/60 shrink-0">
          <button
            onClick={onSearch}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 transition-all duration-200 group"
          >
            <Search size={13} className="text-slate-500 group-hover:text-slate-400 shrink-0" />
            <span className="flex-1 text-left text-xs text-slate-500 group-hover:text-slate-400">Search everything…</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-slate-700 text-[10px] text-slate-600 font-mono">⌘K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-4 px-3 space-y-0.5">
          <p className="px-3 mb-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Menu</p>
          {visibleLinks.map(({ label, to, icon: Icon, description, children }) => {
            const hasChildren = children?.length > 0;

            if (hasChildren) {
              // Dashboard with submenu (admin only)
              const isExpanded = dashOpen;
              return (
                <div key={to}>
                  {/* Parent row — clicking toggles submenu */}
                  <button
                    onClick={() => setDashOpen(o => !o)}
                    className={[
                      'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      childActive ? 'bg-slate-800/50 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50',
                    ].join(' ')}
                  >
                    {childActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                        style={{ background: 'linear-gradient(to bottom, #6366f1, #8b5cf6)' }} />
                    )}
                    <div
                      className={['w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150', childActive ? 'text-white shadow-md shadow-indigo-500/30' : 'text-slate-500'].join(' ')}
                      style={childActive ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className={['text-sm leading-none', childActive ? 'font-semibold text-white' : 'font-medium'].join(' ')}>{label}</p>
                      <p className="text-[10px] text-slate-600 truncate leading-none mt-1">{description}</p>
                    </div>
                    <ChevronDown
                      size={13}
                      className={['text-slate-500 shrink-0 transition-transform duration-200', isExpanded ? 'rotate-180' : ''].join(' ')}
                    />
                  </button>

                  {/* Also keep the main '/' link clickable */}
                  {isExpanded && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-800 pl-3">
                      {/* Admin overview sub-link */}
                      <NavLink
                        to={to}
                        end
                        onClick={onClose}
                        className={({ isActive }) => [
                          'flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                          isActive ? 'bg-slate-800/60 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800/40',
                        ].join(' ')}
                      >
                        {({ isActive }) => (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: isActive ? '#6366f1' : '#475569' }} />
                            <span>Admin Overview</span>
                          </>
                        )}
                      </NavLink>
                      {/* Child links */}
                      {children.map(child => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end={END_PATHS.has(child.to)}
                          onClick={onClose}
                          className={({ isActive }) => [
                            'flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                            isActive ? 'bg-slate-800/60 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800/40',
                          ].join(' ')}
                        >
                          {({ isActive }) => (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: isActive ? '#6366f1' : '#475569' }} />
                              <span>{child.label}</span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Normal flat link
            return (
              <NavLink
                key={to}
                to={to}
                end={END_PATHS.has(to)}
                onClick={onClose}
                className={({ isActive }) => [
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 overflow-hidden',
                  isActive ? 'bg-slate-800/50 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50',
                ].join(' ')}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                        style={{ background: 'linear-gradient(to bottom, #6366f1, #8b5cf6)' }}
                      />
                    )}
                    <div
                      className={['w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150', isActive ? 'text-white shadow-md shadow-indigo-500/30' : 'text-slate-500'].join(' ')}
                      style={isActive ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={['text-sm leading-none', isActive ? 'font-semibold text-white' : 'font-medium'].join(' ')}>{label}</p>
                      <p className="text-[10px] text-slate-600 truncate leading-none mt-1">{description}</p>
                    </div>
                    {isActive && <ChevronRight size={12} className="text-indigo-400 shrink-0" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Notifications (admin/teacher only) */}
        {showNotifications && (
          <div className="px-4 py-2 border-t border-slate-800/60 shrink-0 flex justify-end">
            <NotificationBell />
          </div>
        )}

        {/* Theme + sign out */}
        <div className={"px-4 pb-4 shrink-0 space-y-2" + (!showNotifications ? " border-t border-slate-800/60 pt-2" : "")}>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 transition-all duration-200"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: isDark ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {isDark ? <Sun size={14} className="text-white" /> : <Moon size={14} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-slate-300 leading-none">{isDark ? 'Light Mode' : 'Dark Mode'}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Click to switch</p>
            </div>
            <div
              className="w-8 h-4 rounded-full flex items-center px-0.5 shrink-0 transition-colors duration-300"
              style={{ background: isDark ? '#f59e0b' : '#334155' }}
            >
              <div
                className="w-3 h-3 rounded-full bg-white shadow transition-transform duration-300"
                style={{ transform: isDark ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </div>
          </button>

          {user && (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-900/30 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <LogOut size={14} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-red-400 leading-none">Sign Out</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{user.username}</p>
              </div>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
