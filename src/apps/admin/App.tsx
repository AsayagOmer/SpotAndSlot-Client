import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import RequireAuth from "@/components/RequireAuth";
import NotFound from "@/pages/NotFound";
import AdminLayout from "./components/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Lots from "./pages/Lots";
import Users from "./pages/Users";
import Activity from "./pages/Activity";

const queryClient = new QueryClient();

// Desktop admin console: ADMIN-only, sidebar navigation, wide layout.
// The end-user experience lives in the mobile app (src/apps/mobile).
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth role="ADMIN" fallbackTo="/login">
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/lots" element={<Lots />} />
              <Route path="/users" element={<Users />} />
              <Route path="/activity" element={<Activity />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
