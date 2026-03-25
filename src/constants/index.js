import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Settings,
  CalendarDays,
  ClipboardCheck,
  Banknote,
  Library,
  FileBarChart2,
  Megaphone,
  TrendingDown,
  TrendingUp,
  Bus,
  BookMarked,
  DollarSign,
  NotebookPen,
  CalendarRange,
  Package,
  MessageSquare,
  BookText,
  ListChecks,
  BarChart3,
  FileText,
  Clock,
  Stethoscope,
  ShoppingCart,
  CalendarCheck,
  Award,
  Users2,
  RotateCcw,
  FileCheck,
  Video,
} from 'lucide-react';

/* ── Navigation links ── */
export const NAV_LINKS = [
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
    description: 'Overview & analytics',
  },
  {
    label: 'Teacher View',
    to: '/teacher-dashboard',
    icon: LayoutDashboard,
    description: 'Teacher portal view',
    adminChild: true,
  },
  {
    label: 'Student View',
    to: '/student-dashboard',
    icon: LayoutDashboard,
    description: 'Student portal view',
    adminChild: true,
  },
  {
    label: 'Dashboard',
    to: '/parent-dashboard',
    icon: LayoutDashboard,
    description: 'My child overview',
  },
  {
    label: 'Students',
    to: '/students',
    icon: Users,
    description: 'Manage enrolled students',
  },
  {
    label: 'Teachers',
    to: '/teachers',
    icon: GraduationCap,
    description: 'Staff & assignments',
  },
  {
    label: 'Classes',
    to: '/classes',
    icon: BookOpen,
    description: 'Classes & sections',
  },
  {
    label: 'Timetable',
    to: '/timetable',
    icon: CalendarDays,
    description: 'Class schedules & periods',
  },
  {
    label: 'Attendance',
    to: '/attendance',
    icon: ClipboardCheck,
    description: 'Daily attendance tracking',
  },
  {
    label: 'Subjects',
    to: '/subjects',
    icon: Library,
    description: 'Subjects & teacher assignments',
  },
  {
    label: 'Exams',
    to: '/exams',
    icon: FileBarChart2,
    description: 'Exams, marks & results',
  },
  {
    label: 'Announcements',
    to: '/announcements',
    icon: Megaphone,
    description: 'Notices & announcements',
  },
  {
    label: 'Expenses',
    to: '/expenses',
    icon: TrendingDown,
    description: 'School spending & accounting',
  },
  {
    label: 'Transport',
    to: '/transport',
    icon: Bus,
    description: 'Buses, routes & assignments',
  },
  {
    label: 'Library',
    to: '/library',
    icon: BookMarked,
    description: 'Books, issues & fines',
  },
  {
    label: 'Fees',
    to: '/fees',
    icon: Banknote,
    description: 'Fee management & payments',
  },
  {
    label: 'Salary',
    to: '/salary',
    icon: DollarSign,
    description: 'Teacher payroll & pay slips',
  },
  {
    label: 'Online Classes',
    to: '/online-classes',
    icon: Video,
    description: 'Schedule & join virtual classes',
  },
  {
    label: 'Homework',
    to: '/homework',
    icon: NotebookPen,
    description: 'Assignments & homework',
  },
  {
    label: 'Events',
    to: '/events',
    icon: CalendarRange,
    description: 'School events & holidays',
  },
  {
    label: 'Inventory',
    to: '/inventory',
    icon: Package,
    description: 'Stock & asset management',
  },
  {
    label: 'Admissions',
    to: '/admission/new',
    icon: ClipboardList,
    description: 'New student enrollment',
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    description: 'School info & academic years',
  },
  {
    label: 'Messages',
    to: '/messaging',
    icon: MessageSquare,
    description: 'Parent & teacher messaging',
  },
  {
    label: 'Diary',
    to: '/diary',
    icon: BookText,
    description: 'Daily class diary & homework',
  },
  {
    label: 'Board Exams',
    to: '/board-exams',
    icon: GraduationCap,
    description: 'BISE exam registrations & results',
  },
  {
    label: 'Income',
    to: '/income',
    icon: TrendingUp,
    description: 'Track tuition, donations & other income',
  },
  {
    label: 'Staff Leaves',
    to: '/leaves',
    icon: CalendarDays,
    description: 'Apply, approve & track teacher leave',
  },
  {
    label: 'Syllabus',
    to: '/syllabus',
    icon: ListChecks,
    description: 'Curriculum topics & completion tracking',
  },
  {
    label: 'Financial Analytics',
    to: '/analytics/financial',
    icon: BarChart3,
    description: 'P&L, expenses & fee collection',
  },
  {
    label: 'Annual Report',
    to: '/analytics/annual-report',
    icon: FileText,
    description: 'School-year summary report',
  },
  {
    label: 'Custom Report',
    to: '/analytics/custom-report',
    icon: ClipboardList,
    description: 'Build & export custom reports',
  },
  {
    label: 'Late Arrivals',
    to: '/late-arrivals',
    icon: Clock,
    description: 'Late student arrival register',
  },
  {
    label: 'Medical Records',
    to: '/medical',
    icon: Stethoscope,
    description: 'Student health & vaccination records',
  },
  {
    label: 'Canteen',
    to: '/canteen',
    icon: ShoppingCart,
    description: 'POS & canteen revenue tracking',
  },
  {
    label: 'PTM Scheduler',
    to: '/meetings',
    icon: CalendarCheck,
    description: 'Parent-teacher meeting slots',
  },
  {
    label: 'Scholarships',
    to: '/scholarships',
    icon: Award,
    description: 'Concession approval workflow',
  },
  {
    label: 'Alumni',
    to: '/alumni',
    icon: Users2,
    description: 'Track graduated students',
  },
  {
    label: 'Quizzes',
    to: '/quizzes',
    icon: FileCheck,
    description: 'Online assessments & tests',
  },
];

/* ── Student status colors (static full strings for Tailwind scanning) ── */
export const STATUS_STYLES = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40',
  inactive:  'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  suspended: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
  graduated: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/40',
};

/* ── Gender badge colors ── */
export const GENDER_STYLES = {
  Male:   'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40',
  Female: 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800/40',
  Other:  'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/40',
};

/* ── Avatar gradient pairs [from, to] in hex ── */
export const AVATAR_GRADIENTS = [
  ['#6366f1', '#8b5cf6'],
  ['#8b5cf6', '#a855f7'],
  ['#ec4899', '#f43f5e'],
  ['#f59e0b', '#f97316'],
  ['#06b6d4', '#3b82f6'],
  ['#10b981', '#14b8a6'],
  ['#ef4444', '#f97316'],
  ['#84cc16', '#10b981'],
];

/* ── Grades list ── */
export const GRADES = [
  'Nursery', 'KG',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8',
  'Class 9', 'Class 10', 'Class 11', 'Class 12',
];

/* ── Sections ── */
export const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

/* ── Teacher status colors ── */
export const TEACHER_STATUS_STYLES = {
  active:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  on_leave: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40',
};

/* ── Qualifications ── */
export const QUALIFICATIONS = [
  'B.Ed', 'M.Ed', 'B.A', 'M.A', 'B.Sc', 'M.Sc',
  'B.Com', 'M.Com', 'MBA', 'PhD', 'Other',
];
