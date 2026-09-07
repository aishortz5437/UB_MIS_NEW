import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

// --- Import the Security Guard ---
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Works from "./pages/Works";
import WorkDetail from "./pages/WorkDetail";
import WorkForm from "./pages/WorkForm";
import Employees from "./pages/Employees";
import Approvals from "./pages/Approvals";
import Hierarchy from "./pages/Hierarchy";
import ThirdPartyList from "./pages/ThirdPartyList";
import ThirdPartyDetail from "./pages/ThirdPartyDetail";
import WorkOrderDetail from "./pages/WorkOrderDetail";
import WorkOrderGenerator from "./pages/WorkOrderGenerator";
import NotFound from "./pages/NotFound";
import QuotationRegistry from './pages/Quotations/QuotationRegistry';
import QuotationGenerator from './pages/Quotations/QuotationGenerator';
import FinancialDashboard from './pages/FinancialDashboard';
import TenderForm from './pages/TenderForm';
import HandReceiptForm from './pages/HandReceiptForm';
import TenderRegistry from './pages/TenderRegistry';
import HrRegistry from './pages/HrRegistry';
import NotificationsPage from './pages/NotificationsPage';
import ForwardingLetterGenerator from './pages/Quotations/ForwardingLetterGenerator';
import ForwardingLetterRegistry from './pages/Quotations/ForwardingLetterRegistry';
import InvoiceGenerator from './pages/Quotations/InvoiceGenerator';
import InvoiceRegistry from './pages/Quotations/InvoiceRegistry';
import FinancialSectorView from './pages/FinancialSectorView';
import FinancialDivisionView from './pages/FinancialDivisionView';
import FinancialAllDivisionsView from './pages/FinancialAllDivisionsView';
import GlobalDivisionDetailView from './pages/GlobalDivisionDetailView';
import ResetPassword from './pages/ResetPassword';
import RunningWorksView from './pages/RunningWorksView';
import CompletedWorksView from './pages/CompletedWorksView';
import PipelineView from './pages/Pipeline';
import ReportsView from './pages/ReportsView';
import TravelEmployeeDashboard from './pages/Travel/EmployeeDashboard';
import TravelRequisitionForm from './pages/Travel/RequisitionForm';
import ExpenseRegister from './pages/Travel/ExpenseRegister';
import TravelApprovals from './pages/Travel/Approvals';
import TravelDirectorDashboard from './pages/Travel/DirectorDashboard';

const queryClient = new QueryClient();

const NetworkBanner = () => {
  const { isOnline, wasOffline, connectionChangedAt } = useNetworkStatus();
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline && connectionChangedAt) {
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, connectionChangedAt]);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[120] bg-destructive text-destructive-foreground text-center py-1.5 text-xs font-semibold shadow-md">
        Offline Mode - Some features may be unavailable
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[120] bg-emerald-600 text-white text-center py-1.5 text-xs font-semibold shadow-md animate-in slide-in-from-top-2">
        Connection restored
      </div>
    );
  }

  return null;
};

const AppRoutes = () => {
  return (
    <ErrorBoundary>
      <Routes>
      {/* --- PUBLIC ROUTES --- */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* --- PROTECTED ROUTES --- */}
      {/* 1. Dashboard - Accessible to Everyone who is logged in */}
      <Route path="/" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />

      {/* 2. Management Routes - Restricted to Director/AD */}
      <Route path="/employees" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director']}>
          <Employees />
        </ProtectedRoute>
      } />

      <Route path="/approvals" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director']}>
          <Approvals />
        </ProtectedRoute>
      } />

      {/* 3. Operational Routes - Accessible to Ops Team + Junior Engineer (View) */}
      <Route path="/works" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator', 'Junior Engineer']}>
          <Works />
        </ProtectedRoute>
      } />

      <Route path="/running" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator', 'Junior Engineer']}>
          <RunningWorksView />
        </ProtectedRoute>
      } />

      <Route path="/pipeline" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator', 'Junior Engineer']}>
          <PipelineView />
        </ProtectedRoute>
      } />

      <Route path="/completed" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator', 'Junior Engineer']}>
          <CompletedWorksView />
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <ReportsView />
        </ProtectedRoute>
      } />

      {/* Note: Creating works might be restricted to Admin+, but viewing is okay for Junior Engineer */}
      <Route path="/works/new" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <WorkForm />
        </ProtectedRoute>
      } />

      <Route path="/works/:id" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator', 'Junior Engineer']}>
          <WorkDetail />
        </ProtectedRoute>
      } />

      <Route path="/works/:id/edit" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <WorkForm />
        </ProtectedRoute>
      } />

      {/* 4. Financial/Quotation Routes - Admin Level */}
      <Route path="/quotations" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin']}>
          <QuotationRegistry />
        </ProtectedRoute>
      } />

      <Route path="/quotations/new" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin']}>
          <QuotationGenerator />
        </ProtectedRoute>
      } />

      <Route path="/quotations/view/:id" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <QuotationGenerator />
        </ProtectedRoute>
      } />

      <Route path="/quotations/edit/:id" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin']}>
          <QuotationGenerator />
        </ProtectedRoute>
      } />

      {/* 4b. Tender Route */}
      <Route path="/tender/new" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <TenderForm />
        </ProtectedRoute>
      } />

      {/* 4c. Hand Receipt Route */}
      <Route path="/hand-receipt/new" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <HandReceiptForm />
        </ProtectedRoute>
      } />

      <Route path="/tenders" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <TenderRegistry />
        </ProtectedRoute>
      } />

      <Route path="/tenders/edit/:id" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <TenderForm />
        </ProtectedRoute>
      } />

      <Route path="/hand-receipts" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <HrRegistry />
        </ProtectedRoute>
      } />

      <Route path="/hand-receipts/edit/:id" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <HandReceiptForm />
        </ProtectedRoute>
      } />

      {/* 4d. Forwarding Letter Route */}
      <Route path="/forwarding-letters" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <ForwardingLetterRegistry />
        </ProtectedRoute>
      } />
      <Route path="/forwarding-letter/new" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <ForwardingLetterGenerator />
        </ProtectedRoute>
      } />
      <Route path="/forwarding-letter/edit/:id" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <ForwardingLetterGenerator />
        </ProtectedRoute>
      } />

      {/* 4e. Invoice Route */}
      <Route path="/invoices" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <InvoiceRegistry />
        </ProtectedRoute>
      } />
      <Route path="/invoice/new" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <InvoiceGenerator />
        </ProtectedRoute>
      } />
      <Route path="/invoice/edit/:id" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <InvoiceGenerator />
        </ProtectedRoute>
      } />

      <Route path="/notifications" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director']}>
          <NotificationsPage />
        </ProtectedRoute>
      } />

      {/* Travel and Ledger System */}
      <Route path="/travel" element={
        <ProtectedRoute>
          <TravelEmployeeDashboard />
        </ProtectedRoute>
      } />
      <Route path="/travel/new" element={
        <ProtectedRoute>
          <TravelRequisitionForm />
        </ProtectedRoute>
      } />
      <Route path="/travel/expenses/:id" element={
        <ProtectedRoute>
          <ExpenseRegister />
        </ProtectedRoute>
      } />
      <Route path="/travel/edit/:id" element={
        <ProtectedRoute>
          <TravelRequisitionForm />
        </ProtectedRoute>
      } />
      
      <Route path="/travel/approvals" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director']}>
          <TravelApprovals />
        </ProtectedRoute>
      } />
      <Route path="/travel/director-dashboard" element={
        <ProtectedRoute requiredRole={['Director']}>
          <TravelDirectorDashboard />
        </ProtectedRoute>
      } />

      <Route path="/finance" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin']}>
          <FinancialDashboard />
        </ProtectedRoute>
      } />

      <Route path="/finance/divisions" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin']}>
          <FinancialAllDivisionsView />
        </ProtectedRoute>
      } />

      <Route path="/finance/divisions/:divisionName" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin']}>
          <GlobalDivisionDetailView />
        </ProtectedRoute>
      } />

      <Route path="/finance/:sectorId" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin']}>
          <FinancialSectorView />
        </ProtectedRoute>
      } />

      <Route path="/finance/:sectorId/div/:divisionId" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin']}>
          <FinancialDivisionView />
        </ProtectedRoute>
      } />

      {/* 5. Hierarchy/Divisions - Viewable by all */}
      <Route path="/hierarchy" element={
        <ProtectedRoute>
          <Hierarchy />
        </ProtectedRoute>
      } />

      {/* 6. Third Party - Ops Team */}
      <Route path="/third-party" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <ThirdPartyList />
        </ProtectedRoute>
      } />

      <Route path="/third-party/:id" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <ThirdPartyDetail />
        </ProtectedRoute>
      } />

      <Route path="/third-party/work/:workId" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <WorkOrderDetail />
        </ProtectedRoute>
      } />

      <Route path="/third-party/work/:workId/work-order" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <WorkOrderGenerator />
        </ProtectedRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* Moved BrowserRouter OUTSIDE so AuthProvider can use useNavigate if needed */}
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <NetworkBanner />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;