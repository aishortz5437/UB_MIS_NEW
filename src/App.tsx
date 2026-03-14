import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

// --- Import the Security Guard ---
import { ProtectedRoute } from "@/components/ProtectedRoute";

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
import NotFound from "./pages/NotFound";
import QuotationRegistry from './pages/Quotations/QuotationRegistry';
import QuotationGenerator from './pages/Quotations/QuotationGenerator';
import FinancialDashboard from './pages/FinancialDashboard';
import TenderForm from './pages/TenderForm';
import HandReceiptForm from './pages/HandReceiptForm';
import NotificationsPage from './pages/NotificationsPage';
import ForwardingLetterGenerator from './pages/Quotations/ForwardingLetterGenerator';
import InvoiceGenerator from './pages/Quotations/InvoiceGenerator';
import FinancialSectorView from './pages/FinancialSectorView';
import FinancialDivisionView from './pages/FinancialDivisionView';

const queryClient = new QueryClient();

const AppRoutes = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold text-destructive">No Internet Connection</h1>
        <p>Please check your network settings.</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* --- PUBLIC ROUTE (Login) --- */}
      <Route path="/auth" element={<Auth />} />

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

      {/* Note: Creating works might be restricted to Admin+, but viewing is okay for Junior Engineer */}
      <Route path="/works/new" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator', 'Junior Engineer']}>
          <WorkForm />
        </ProtectedRoute>
      } />

      <Route path="/works/:id" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator', 'Junior Engineer']}>
          <WorkDetail />
        </ProtectedRoute>
      } />

      <Route path="/works/:id/edit" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator', 'Junior Engineer']}>
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

      {/* 4d. Forwarding Letter Route */}
      <Route path="/forwarding-letter/new" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <ForwardingLetterGenerator />
        </ProtectedRoute>
      } />

      {/* 4e. Invoice Route */}
      <Route path="/invoice/new" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin', 'Co-ordinator']}>
          <InvoiceGenerator />
        </ProtectedRoute>
      } />

      {/* Notifications - Director/AD only */}
      <Route path="/notifications" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director']}>
          <NotificationsPage />
        </ProtectedRoute>
      } />

      <Route path="/finance" element={
        <ProtectedRoute requiredRole={['Director', 'Assistant Director', 'Admin']}>
          <FinancialDashboard />
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

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
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
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;