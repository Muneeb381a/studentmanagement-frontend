import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

/* Auth */
import LoginPage from './pages/LoginPage';

/* Role Dashboards */
import DashboardPage          from './pages/DashboardPage';
import TeacherDashboardPage   from './pages/TeacherDashboardPage';
import StudentDashboardPage   from './pages/StudentDashboardPage';
import ParentDashboardPage    from './pages/ParentDashboardPage';

/* Admin pages */
import StudentsPage       from './pages/StudentsPage';
import TeachersPage       from './pages/TeachersPage';
import TeacherDetailPage  from './pages/TeacherDetailPage';
import ClassesPage        from './pages/ClassesPage';
import AdmissionPage      from './pages/AdmissionPage';
import ClassDetailPage    from './pages/ClassDetailPage';
import TimetablePage      from './pages/TimetablePage';
import TimetablePrintPage from './pages/TimetablePrintPage';
import AttendancePage     from './pages/AttendancePage';
import FeesPage           from './pages/FeesPage';
import SubjectsPage       from './pages/SubjectsPage';
import ExamsPage          from './pages/ExamsPage';
import ReportCardPrintPage   from './pages/ReportCardPrintPage';
import StudentIdCardPage    from './pages/StudentIdCardPage';
import CertificatePrintPage from './pages/CertificatePrintPage';
import AnnouncementsPage  from './pages/AnnouncementsPage';
import ExpensesPage       from './pages/ExpensesPage';
import TransportPage      from './pages/TransportPage';
import LibraryPage        from './pages/LibraryPage';
import FeeInvoicePrint   from './pages/FeeInvoicePrint';
import FeeReceiptPrint   from './pages/FeeReceiptPrint';
import FeeBulkPrintPage          from './pages/FeeBulkPrintPage';
import FeeDefaultersPrintPage    from './pages/FeeDefaultersPrintPage';
import SalaryPage                from './pages/SalaryPage';
import SalarySlipPrintPage       from './pages/SalarySlipPrintPage';
import HomeworkPage              from './pages/HomeworkPage';
import EventsPage                from './pages/EventsPage';
import InventoryPage             from './pages/InventoryPage';
import SettingsPage              from './pages/SettingsPage';
import StudentPerformancePage    from './pages/StudentPerformancePage';
import StudentDetailPrintPage   from './pages/StudentDetailPrintPage';
import NotFoundPage              from './pages/NotFoundPage';
import MessagingPage             from './pages/MessagingPage';
import DiaryPage                from './pages/DiaryPage';
import FeeChallanPrint          from './pages/FeeChallanPrint';
import AttendancePrintPage      from './pages/AttendancePrintPage';
import BoardExamsPage           from './pages/BoardExamsPage';
import IncomePage               from './pages/IncomePage';
import LeavePage                from './pages/LeavePage';
import SetupPage                from './pages/SetupPage';
import FeeStructurePrintPage    from './pages/FeeStructurePrintPage';
import SyllabusPage             from './pages/SyllabusPage';
import FinancialAnalyticsPage   from './pages/FinancialAnalyticsPage';
import AnnualReportPage         from './pages/AnnualReportPage';
import CustomReportPage         from './pages/CustomReportPage';

/* Redirect / → role-appropriate home */
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
  if (user.role === 'student') return <Navigate to="/student-dashboard" replace />;
  if (user.role === 'parent')  return <Navigate to="/parent-dashboard"  replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/setup" element={<SetupPage />} />

            {/* Root → smart redirect */}
            <Route path="/" element={
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            } />

            {/* Role dashboards */}
            <Route path="/teacher-dashboard" element={
              <ProtectedRoute roles={['teacher', 'admin']}>
                <TeacherDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard" element={
              <ProtectedRoute roles={['student', 'admin']}>
                <StudentDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/parent-dashboard" element={
              <ProtectedRoute roles={['parent', 'admin']}>
                <ParentDashboardPage />
              </ProtectedRoute>
            } />

            {/* Admin-only pages */}
            <Route path="/students" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <StudentsPage />
              </ProtectedRoute>
            } />
            <Route path="/students/id-cards" element={
              <ProtectedRoute roles={['admin']}>
                <StudentIdCardPage />
              </ProtectedRoute>
            } />
            <Route path="/students/certificate" element={
              <ProtectedRoute roles={['admin']}>
                <CertificatePrintPage />
              </ProtectedRoute>
            } />
            <Route path="/teachers" element={
              <ProtectedRoute roles={['admin']}>
                <TeachersPage />
              </ProtectedRoute>
            } />
            <Route path="/teachers/:id" element={
              <ProtectedRoute roles={['admin']}>
                <TeacherDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/classes" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ClassesPage />
              </ProtectedRoute>
            } />
            <Route path="/classes/:id" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ClassDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/admission/new" element={
              <ProtectedRoute roles={['admin']}>
                <AdmissionPage />
              </ProtectedRoute>
            } />
            <Route path="/admission/edit/:id" element={
              <ProtectedRoute roles={['admin']}>
                <AdmissionPage />
              </ProtectedRoute>
            } />
            <Route path="/timetable" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <TimetablePage />
              </ProtectedRoute>
            } />
            <Route path="/timetable/print" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <TimetablePrintPage />
              </ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <AttendancePage />
              </ProtectedRoute>
            } />
            <Route path="/attendance/print" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <AttendancePrintPage />
              </ProtectedRoute>
            } />
            <Route path="/fees" element={
              <ProtectedRoute roles={['admin']}>
                <FeesPage />
              </ProtectedRoute>
            } />
            <Route path="/subjects" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <SubjectsPage />
              </ProtectedRoute>
            } />
            <Route path="/exams" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ExamsPage />
              </ProtectedRoute>
            } />
            <Route path="/exams/report-card/print" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ReportCardPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/announcements" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <AnnouncementsPage />
              </ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute roles={['admin']}>
                <ExpensesPage />
              </ProtectedRoute>
            } />
            <Route path="/transport" element={
              <ProtectedRoute roles={['admin']}>
                <TransportPage />
              </ProtectedRoute>
            } />
            <Route path="/library" element={
              <ProtectedRoute roles={['admin']}>
                <LibraryPage />
              </ProtectedRoute>
            } />
            <Route path="/fees/invoice/:id/print" element={
              <ProtectedRoute roles={['admin']}>
                <FeeInvoicePrint />
              </ProtectedRoute>
            } />
            <Route path="/fees/invoice/:id/challan" element={
              <ProtectedRoute roles={['admin']}>
                <FeeChallanPrint />
              </ProtectedRoute>
            } />
            <Route path="/fees/receipt/:id" element={
              <ProtectedRoute roles={['admin']}>
                <FeeReceiptPrint />
              </ProtectedRoute>
            } />
            <Route path="/fees/bulk-print" element={
              <ProtectedRoute roles={['admin']}>
                <FeeBulkPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/fees/defaulters/print" element={
              <ProtectedRoute roles={['admin']}>
                <FeeDefaultersPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/fees/structure/print" element={
              <ProtectedRoute roles={['admin']}>
                <FeeStructurePrintPage />
              </ProtectedRoute>
            } />
            <Route path="/salary" element={
              <ProtectedRoute roles={['admin']}>
                <SalaryPage />
              </ProtectedRoute>
            } />
            <Route path="/salary/slip/:id/print" element={
              <ProtectedRoute roles={['admin']}>
                <SalarySlipPrintPage />
              </ProtectedRoute>
            } />
            <Route path="/homework" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <HomeworkPage />
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <EventsPage />
              </ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute roles={['admin']}>
                <InventoryPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute roles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/diary" element={
              <ProtectedRoute roles={['admin', 'teacher', 'student', 'parent']}>
                <DiaryPage />
              </ProtectedRoute>
            } />
            <Route path="/messaging" element={
              <ProtectedRoute roles={['admin', 'teacher', 'parent', 'student']}>
                <MessagingPage />
              </ProtectedRoute>
            } />
            <Route path="/board-exams" element={
              <ProtectedRoute roles={['admin']}>
                <BoardExamsPage />
              </ProtectedRoute>
            } />
            <Route path="/income" element={
              <ProtectedRoute roles={['admin']}>
                <IncomePage />
              </ProtectedRoute>
            } />
            <Route path="/leaves" element={
              <ProtectedRoute roles={['admin']}>
                <LeavePage />
              </ProtectedRoute>
            } />
            <Route path="/syllabus" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <SyllabusPage />
              </ProtectedRoute>
            } />

            <Route path="/students/:id/print" element={<StudentDetailPrintPage />} />
            <Route path="/students/:id/performance" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <StudentPerformancePage />
              </ProtectedRoute>
            } />
            <Route path="/analytics/financial" element={
              <ProtectedRoute roles={['admin']}>
                <FinancialAnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/analytics/annual-report" element={
              <ProtectedRoute roles={['admin']}>
                <AnnualReportPage />
              </ProtectedRoute>
            } />
            <Route path="/analytics/custom-report" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <CustomReportPage />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: '500',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
