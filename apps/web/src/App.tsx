import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomeRoute } from './components/HomeRoute';
import { Layout } from './components/Layout';
import { ProtectedLayout } from './components/ProtectedLayout';
import { RealtimeProvider } from './components/RealtimeProvider';
import { AuthProvider } from './lib/auth';
import { SettingsProvider } from './lib/settings';
import { AttendanceMarkPage } from './pages/AttendanceMarkPage';
import { AttendanceTrackerPage } from './pages/AttendanceTrackerPage';
import { ClassRosterPage } from './pages/ClassRosterPage';
import { ExamMarksPage } from './pages/ExamMarksPage';
import { InvoiceCreatePage } from './pages/InvoiceCreatePage';
import { LibraryLoansPage } from './pages/LibraryLoansPage';
import { LoginPage, ParentLoginPage, TeacherLoginPage } from './pages/LoginPage';
import { MessagesPage } from './pages/MessagesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ParentPortalPage } from './pages/ParentPortalPage';
import { PaymentCreatePage } from './pages/PaymentCreatePage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { ResourceListPage } from './pages/ResourceListPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeacherPortalPage } from './pages/TeacherPortalPage';
import { TimetablePage } from './pages/TimetablePage';

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <SettingsProvider>
            <RealtimeProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/login/teacher" element={<TeacherLoginPage />} />
                <Route path="/login/parent" element={<ParentLoginPage />} />
                <Route element={<ProtectedLayout />}>
                  <Route element={<Layout />}>
                    <Route index element={<HomeRoute />} />
                    <Route path="teacher" element={<TeacherPortalPage />} />
                    <Route path="parent" element={<ParentPortalPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="messages" element={<MessagesPage />} />
                    <Route path="timetable" element={<TimetablePage />} />
                    <Route path="attendance/mark" element={<AttendanceMarkPage />} />
                    <Route path="attendance/tracker" element={<AttendanceTrackerPage />} />
                    <Route path="class-roster" element={<ClassRosterPage />} />
                    <Route path="exams/marks" element={<ExamMarksPage />} />
                    <Route path="library/loans" element={<LibraryLoansPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="invoices/new" element={<InvoiceCreatePage />} />
                    <Route path="payments/new" element={<PaymentCreatePage />} />
                    <Route path="resource/:key" element={<ResourceListPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Route>
              </Routes>
            </RealtimeProvider>
          </SettingsProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
