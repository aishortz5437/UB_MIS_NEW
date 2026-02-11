import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Works from "./pages/Works";
import WorkDetail from "./pages/WorkDetail";
import WorkForm from "./pages/WorkForm";
import Employees from "./pages/Employees";
import Hierarchy from "./pages/Hierarchy";
import ThirdPartyList from "./pages/ThirdPartyList";
import ThirdPartyDetail from "./pages/ThirdPartyDetail";
import WorkOrderDetail from "./pages/WorkOrderDetail";
import NotFound from "./pages/NotFound";
import QuotationRegistry from './pages/Quotations/QuotationRegistry';
import QuotationGenerator from './pages/Quotations/QuotationGenerator';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/works" element={<Works />} />
            <Route path="/works/new" element={<WorkForm />} />
            <Route path="/works/:id" element={<WorkDetail />} />
            <Route path="/works/:id/edit" element={<WorkForm />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/quotations" element={<QuotationRegistry />} />
            <Route path="/quotations/new" element={<QuotationGenerator />} />
            <Route path="/quotations/view/:id" element={<QuotationGenerator />} />
            <Route path="/quotations/edit/:id" element={<QuotationGenerator />} />
            <Route path="/hierarchy" element={<Hierarchy />} />
            <Route path="/third-party" element={<ThirdPartyList />} />
            <Route path="/third-party/:id" element={<ThirdPartyDetail />} />
            <Route path="/third-party/work/:workId" element={<WorkOrderDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
