import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import ProtectedRoute from './app/routes/ProtectedRoute'
import RequireRole from './app/components/RequireRole'
import LoginPage from './features/auth/pages/LoginPage'
import RegisterPage from './features/auth/pages/RegisterPage'
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage'
import VerifyEmailPage from './features/auth/pages/VerifyEmailPage'
import ForbiddenPage from './features/auth/pages/ForbiddenPage'
import SchoolSettingsPage from './features/school-settings/pages/SchoolSettingsPage'
import AcademicYearsPage from './features/school-settings/pages/AcademicYearsPage'
import SchoolsListPage from './features/school-settings/pages/SchoolsListPage'
import StudentListPage from './features/students/pages/StudentListPage'
import StudentFormPage from './features/students/pages/StudentFormPage'
import Student360Page from './features/students/pages/Student360Page'
import MyChildrenPage from './features/students/pages/MyChildrenPage'
import TeacherListPage from './features/teachers/pages/TeacherListPage'
import TeacherFormPage from './features/teachers/pages/TeacherFormPage'
import TeacherProfilePage from './features/teachers/pages/TeacherProfilePage'
import TeacherSelfPage from './features/teachers/pages/TeacherSelfPage'
import ClassListPage from './features/classes/pages/ClassListPage'
import ClassFormPage from './features/classes/pages/ClassFormPage'
import ClassDetailPage from './features/classes/pages/ClassDetailPage'
import SubjectListPage from './features/subjects/pages/SubjectListPage'
import SubjectFormPage from './features/subjects/pages/SubjectFormPage'
import MarkAttendancePage from './features/attendance/pages/MarkAttendancePage'
import ClassAttendanceViewPage from './features/attendance/pages/ClassAttendanceViewPage'
import StudentAttendanceHistoryPage from './features/attendance/pages/StudentAttendanceHistoryPage'
import AttendanceAnalyticsPage from './features/attendance/pages/AttendanceAnalyticsPage'
import TimetableBuilderPage from './features/timetable/pages/TimetableBuilderPage'
import ClassTimetablePage from './features/timetable/pages/ClassTimetablePage'
import TeacherTimetablePage from './features/timetable/pages/TeacherTimetablePage'
import TeacherAssignmentListPage from './features/assignments/pages/TeacherAssignmentListPage'
import AssignmentFormPage from './features/assignments/pages/AssignmentFormPage'
import GradingViewPage from './features/assignments/pages/GradingViewPage'
import StudentAssignmentListPage from './features/assignments/pages/StudentAssignmentListPage'
import SubmitAssignmentPage from './features/assignments/pages/SubmitAssignmentPage'
import ParentChildAssignmentsPage from './features/assignments/pages/ParentChildAssignmentsPage'
import ExamSetupPage from './features/exams/pages/ExamSetupPage'
import ExamListPage from './features/exams/pages/ExamListPage'
import MarksEntryPage from './features/exams/pages/MarksEntryPage'
import ResultsViewPage from './features/exams/pages/ResultsViewPage'
import ReportCardPage from './features/exams/pages/ReportCardPage'
import FeeStructureListPage from './features/fees/pages/FeeStructureListPage'
import FeeStructureFormPage from './features/fees/pages/FeeStructureFormPage'
import InvoiceListPage from './features/fees/pages/InvoiceListPage'
import InvoiceDetailPage from './features/fees/pages/InvoiceDetailPage'
import InvoiceGeneratePage from './features/fees/pages/InvoiceGeneratePage'
import CollectionDashboardPage from './features/fees/pages/CollectionDashboardPage'
import StudentFeeViewPage from './features/fees/pages/StudentFeeViewPage'
import ReceiptViewPage from './features/fees/pages/ReceiptViewPage'
import ConversationListPage from './features/messages/pages/ConversationListPage'
import ConversationThreadPage from './features/messages/pages/ConversationThreadPage'
import NewConversationPage from './features/messages/pages/NewConversationPage'
import ParentPortalLayout from './features/parent-portal/pages/ParentPortalLayout'
import ParentDashboardPage from './features/parent-portal/pages/ParentDashboardPage'
import NotificationsPage from './features/notifications/pages/NotificationsPage'
import NotificationPreferencesPage from './features/notifications/pages/NotificationPreferencesPage'
import LeaveRequestFormPage from './features/leave/pages/LeaveRequestFormPage'
import LeaveListPage from './features/leave/pages/LeaveListPage'
import LeaveReviewPage from './features/leave/pages/LeaveReviewPage'
import DisciplineCreatePage from './features/discipline/pages/DisciplineCreatePage'
import DisciplineListPage from './features/discipline/pages/DisciplineListPage'
import DisciplineDetailPage from './features/discipline/pages/DisciplineDetailPage'
import VehicleListPage from './features/transport/pages/VehicleListPage'
import VehicleFormPage from './features/transport/pages/VehicleFormPage'
import DriverListPage from './features/transport/pages/DriverListPage'
import DriverFormPage from './features/transport/pages/DriverFormPage'
import StopListPage from './features/transport/pages/StopListPage'
import RouteListPage from './features/transport/pages/RouteListPage'
import RouteDetailPage from './features/transport/pages/RouteDetailPage'
import RouteFormPage from './features/transport/pages/RouteFormPage'
import StudentTransportPage from './features/transport/pages/StudentTransportPage'
import SchoolAdminDashboard from './features/analytics/pages/SchoolAdminDashboard'
import PrincipalDashboard from './features/analytics/pages/PrincipalDashboard'
import TeacherDashboard from './features/analytics/pages/TeacherDashboard'
import AccountantDashboard from './features/analytics/pages/AccountantDashboard'
import StudentDashboard from './features/analytics/pages/StudentDashboard'
import AuditLogsPage from './features/audit/pages/AuditLogsPage'
import AuditLogDetailPage from './features/audit/pages/AuditLogDetailPage'
import './index.css'

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Protected routes — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            {/* Role-based dashboards */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin']} />}>
              <Route path="/dashboard" element={<SchoolAdminDashboard />} />
            </Route>
            <Route element={<RequireRole roles={['principal']} />}>
              <Route path="/dashboard" element={<PrincipalDashboard />} />
            </Route>
            <Route element={<RequireRole roles={['teacher']} />}>
              <Route path="/dashboard" element={<TeacherDashboard />} />
            </Route>
            <Route element={<RequireRole roles={['accountant']} />}>
              <Route path="/dashboard" element={<AccountantDashboard />} />
            </Route>
            <Route element={<RequireRole roles={['student']} />}>
              <Route path="/dashboard" element={<StudentDashboard />} />
            </Route>
            {/* Parent uses portal */}

            {/* School settings — school_admin / principal */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal']} />}>
              <Route path="/school-settings" element={<SchoolSettingsPage />} />
              <Route path="/school-settings/academic-years" element={<AcademicYearsPage />} />
            </Route>

            {/* Super admin — all schools management */}
            <Route element={<RequireRole roles={['super_admin']} />}>
              <Route path="/admin/schools" element={<SchoolsListPage />} />
            </Route>
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal']} />}>
              <Route path="/audit/logs" element={<AuditLogsPage />} />
              <Route path="/audit/logs/:id" element={<AuditLogDetailPage />} />
              <Route path="/audit/history" element={<AuditLogsPage history />} />
            </Route>

            {/* Student management */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'teacher', 'parent']} />}>
              <Route path="/students" element={<StudentListPage />} />
              <Route path="/students/new" element={<StudentFormPage />} />
              <Route path="/students/:id" element={<Student360Page />} />
              <Route path="/students/:id/edit" element={<StudentFormPage />} />
              <Route path="/students/:id/360" element={<Student360Page />} />
            </Route>

            {/* Parent — my children */}
            <Route element={<RequireRole roles={['parent']} />}>
              <Route path="/my-children" element={<MyChildrenPage />} />
            </Route>

            {/* Teacher management — school_admin, principal, hr, teacher (self) */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'hr', 'teacher']} />}>
              <Route path="/teachers" element={<TeacherListPage />} />
              <Route path="/teachers/new" element={<TeacherFormPage />} />
              <Route path="/teachers/:id" element={<TeacherProfilePage />} />
              <Route path="/teachers/:id/edit" element={<TeacherFormPage />} />
              <Route path="/teachers/:id/profile" element={<TeacherProfilePage />} />
              <Route path="/my-profile" element={<TeacherSelfPage />} />
            </Route>

            {/* Classes */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent']} />}>
              <Route path="/classes" element={<ClassListPage />} />
              <Route path="/classes/new" element={<ClassFormPage />} />
              <Route path="/classes/:id" element={<ClassDetailPage />} />
              <Route path="/classes/:id/edit" element={<ClassFormPage />} />
            </Route>

            {/* Subjects */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'teacher', 'student']} />}>
              <Route path="/subjects" element={<SubjectListPage />} />
              <Route path="/subjects/new" element={<SubjectFormPage />} />
              <Route path="/subjects/:id/edit" element={<SubjectFormPage />} />
            </Route>

            {/* Attendance */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'teacher']} />}>
              <Route path="/attendance/mark" element={<MarkAttendancePage />} />
              <Route path="/attendance/analytics" element={<AttendanceAnalyticsPage />} />
            </Route>
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent']} />}>
              <Route path="/attendance/class/:classId" element={<ClassAttendanceViewPage />} />
              <Route path="/attendance/student/:studentId" element={<StudentAttendanceHistoryPage />} />
            </Route>

            {/* Timetable */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin']} />}>
              <Route path="/timetable/builder" element={<TimetableBuilderPage />} />
            </Route>
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent']} />}>
              <Route path="/timetable/class/:classId" element={<ClassTimetablePage />} />
              <Route path="/timetable/teacher/:teacherId" element={<TeacherTimetablePage />} />
            </Route>

            {/* Assignments — Teacher/Admin */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'teacher']} />}>
              <Route path="/assignments" element={<TeacherAssignmentListPage />} />
              <Route path="/assignments/new" element={<AssignmentFormPage />} />
              <Route path="/assignments/:id/edit" element={<AssignmentFormPage />} />
              <Route path="/assignments/:id/submissions" element={<GradingViewPage />} />
            </Route>

            {/* Assignments — Student */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'student']} />}>
              <Route path="/my-assignments" element={<StudentAssignmentListPage />} />
              <Route path="/assignments/:id/submit" element={<SubmitAssignmentPage />} />
            </Route>

            {/* Assignments — Parent */}
            <Route element={<RequireRole roles={['parent']} />}>
              <Route path="/child/:childId/assignments" element={<ParentChildAssignmentsPage />} />
            </Route>

            {/* Exams — Admin */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal']} />}>
              <Route path="/exams" element={<ExamListPage />} />
              <Route path="/exams/new" element={<ExamSetupPage />} />
              <Route path="/exams/:id/publish" element={<ExamListPage />} />
            </Route>

            {/* Exams — Teacher (marks entry) */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'teacher']} />}>
              <Route path="/exams/:id/marks" element={<MarksEntryPage />} />
            </Route>

            {/* Exams — Student/Parent (results) */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent']} />}>
              <Route path="/exams/:id/results" element={<ResultsViewPage />} />
              <Route path="/exams/:id/report-card/:studentId" element={<ReportCardPage />} />
            </Route>

            {/* Fees & Finance — Accountant / School Admin */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'accountant', 'principal']} />}>
              <Route path="/fees/structures" element={<FeeStructureListPage />} />
              <Route path="/fees/structures/new" element={<FeeStructureFormPage />} />
              <Route path="/fees/structures/:id/edit" element={<FeeStructureFormPage />} />
              <Route path="/fees/invoices" element={<InvoiceListPage />} />
              <Route path="/fees/invoices/generate" element={<InvoiceGeneratePage />} />
              <Route path="/fees/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/fees/collection" element={<CollectionDashboardPage />} />
            </Route>

            {/* Fees — Student/Parent */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'student', 'parent']} />}>
              <Route path="/fees/payments/:id/receipt" element={<ReceiptViewPage />} />
            </Route>

            {/* Messaging — all authenticated users */}
            <Route path="/messages" element={<ConversationListPage />} />
            <Route path="/messages/new" element={<NewConversationPage />} />
            <Route path="/messages/:id" element={<ConversationThreadPage />} />

            {/* Parent Portal */}
            <Route element={<RequireRole roles={['parent']} />}>
              <Route path="/portal" element={<ParentPortalLayout><ParentDashboardPage /></ParentPortalLayout>} />
              <Route path="/portal/fees" element={<ParentPortalLayout><StudentFeeViewPage /></ParentPortalLayout>} />
            </Route>

            {/* Leave — all authenticated users */}
            <Route path="/leave" element={<LeaveListPage />} />
            <Route path="/leave/new" element={<LeaveRequestFormPage />} />
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'hr']} />}>
              <Route path="/leave/:id/review" element={<LeaveReviewPage />} />
            </Route>

            {/* Discipline — teacher/admin */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'principal', 'teacher']} />}>
              <Route path="/discipline" element={<DisciplineListPage />} />
              <Route path="/discipline/new" element={<DisciplineCreatePage />} />
              <Route path="/discipline/:id" element={<DisciplineDetailPage />} />
            </Route>

            {/* Transport — manager/admin */}
            <Route element={<RequireRole roles={['super_admin', 'school_admin', 'transport_manager']} />}>
              <Route path="/transport/vehicles" element={<VehicleListPage />} />
              <Route path="/transport/vehicles/new" element={<VehicleFormPage />} />
              <Route path="/transport/vehicles/:id/edit" element={<VehicleFormPage />} />
              <Route path="/transport/drivers" element={<DriverListPage />} />
              <Route path="/transport/drivers/new" element={<DriverFormPage />} />
              <Route path="/transport/drivers/:id/edit" element={<DriverFormPage />} />
              <Route path="/transport/stops" element={<StopListPage />} />
              <Route path="/transport/routes" element={<RouteListPage />} />
              <Route path="/transport/routes/new" element={<RouteFormPage />} />
              <Route path="/transport/routes/:id" element={<RouteDetailPage />} />
            </Route>

            {/* Transport — parent/student view */}
            <Route element={<RequireRole roles={['parent', 'student']} />}>
              <Route path="/my-transport" element={<StudentTransportPage />} />
            </Route>

            {/* Notifications — all authenticated users */}
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/notifications/preferences" element={<NotificationPreferencesPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  )
}

export default App
