import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import AuthForm from "../features/auth/AuthForm";
import ClientForm from "../features/clients/ClientForm";
import ClientDetailsPage from "../features/clients/ClientDetailsPage";
import ClientsPage from "../features/clients/ClientsPage";
import AppointmentForm from "../features/appointments/AppointmentForm";
import AppointmentsPage from "../features/appointments/AppointmentsPage";
import ServiceForm from "../features/services/ServiceForm";
import ServicesPage from "../features/services/ServicesPage";
import SettingsPage from "../features/settings/SettingsPage";
import ReportsPage from "../features/reports/ReportsPage";
import FinancePage from "../features/finance/FinancePage";
import QuotesPage from "../features/quotes/QuotesPage";
import PublicQuotePage from "../features/quotes/PublicQuotePage";
import PublicBookingPage from "../features/publicBooking/PublicBookingPage";
import {
  ForgotPasswordPage,
  ResetPasswordPage,
} from "../features/auth/PasswordPages";
import ConfigurationPage from "../pages/ConfigurationPage";
import DashboardPage from "../pages/DashboardPage";
import LandingPage from "../pages/LandingPage";
import LegalPage from "../pages/LegalPage";
import { GuestRoute, ProtectedRoute } from "./RouteGuards";
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/cadastro" element={<AuthForm mode="register" />} />
      </Route>
      <Route path="/configuracao" element={<ConfigurationPage />} />
      <Route path="/esqueci-a-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route path="/agendar/:slug" element={<PublicBookingPage />} />
      <Route path="/orcamento/:token" element={<PublicQuotePage />} />
      <Route path="/privacidade" element={<LegalPage />} />
      <Route path="/termos" element={<LegalPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="clientes" element={<ClientsPage />} />
          <Route path="clientes/novo" element={<ClientForm />} />
          <Route path="clientes/:id" element={<ClientDetailsPage />} />
          <Route path="clientes/:id/editar" element={<ClientForm />} />
          <Route path="servicos" element={<ServicesPage />} />
          <Route path="servicos/novo" element={<ServiceForm />} />
          <Route path="servicos/:id/editar" element={<ServiceForm />} />
          <Route path="agenda" element={<AppointmentsPage />} />
          <Route path="agenda/novo" element={<AppointmentForm />} />
          <Route path="agenda/:id/editar" element={<AppointmentForm />} />
          <Route path="relatorios" element={<ReportsPage />} />
          <Route path="financeiro" element={<FinancePage />} />
          <Route path="orcamentos" element={<QuotesPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
