import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomeRoute } from './components/HomeRoute';
import { Layout } from './components/Layout';
import { ProtectedLayout } from './components/ProtectedLayout';
import { PublicLayout } from './components/PublicLayout';
import { RealtimeProvider } from './components/RealtimeProvider';
import { AuthProvider } from './lib/auth';
import { SettingsProvider } from './lib/settings';
import { AttendanceMarkPage } from './pages/AttendanceMarkPage';
import { AttendanceTrackerPage } from './pages/AttendanceTrackerPage';
import { ClassRosterPage } from './pages/ClassRosterPage';
import { ExamMarksPage } from './pages/ExamMarksPage';
import { FeeDeskPage } from './pages/FeeDeskPage';
import { InvoiceCreatePage } from './pages/InvoiceCreatePage';
import { LibraryLoansPage } from './pages/LibraryLoansPage';
import { LoginPage, ParentLoginPage, TeacherLoginPage } from './pages/LoginPage';
import { MessagesPage } from './pages/MessagesPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ParentPortalPage } from './pages/ParentPortalPage';
import { PaymentCreatePage } from './pages/PaymentCreatePage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { ReportCardsPage } from './pages/ReportCardsPage';
import { ResourceListPage } from './pages/ResourceListPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeacherPortalPage } from './pages/TeacherPortalPage';
import { TimetablePage } from './pages/TimetablePage';
import { PublicAboutPage } from './pages/public/PublicAboutPage';
import { PublicContactPage } from './pages/public/PublicContactPage';
import { PublicFaqPage } from './pages/public/PublicFaqPage';
import { PublicFeaturesPage } from './pages/public/PublicFeaturesPage';
import { PublicHomePage } from './pages/public/PublicHomePage';
import { PublicModulesPage } from './pages/public/PublicModulesPage';
import { PublicPlansPage } from './pages/public/PublicPlansPage';

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
                <Route path="/site" element={<PublicLayout />}>
                  <Route index element={<PublicHomePage />} />
                  <Route path="about" element={<PublicAboutPage />} />
                  <Route path="features" element={<PublicFeaturesPage />} />
                  <Route path="modules" element={<PublicModulesPage />} />
                  <Route path="plans" element={<PublicPlansPage />} />
                  <Route path="faq" element={<PublicFaqPage />} />
                  <Route path="contact" element={<PublicContactPage />} />
                </Route>
                <Route element={<ProtectedLayout />}>
                  <Route element={<Layout />}>
                    <Route index element={<HomeRoute />} />
                    <Route path="teacher" element={<TeacherPortalPage />} />
                    <Route path="parent" element={<ParentPortalPage />} />
                    <Route path="requests" element={<MyRequestsPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="report-cards" element={<ReportCardsPage />} />
                    <Route path="fee-desk" element={<FeeDeskPage />} />
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
