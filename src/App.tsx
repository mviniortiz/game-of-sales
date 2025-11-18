import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Ranking from "./pages/Ranking";
import NovaVenda from "./pages/NovaVenda";
import Calls from "./pages/Calls";
import Metas from "./pages/Metas";
import Admin from "./pages/Admin";
import Integracoes from "./pages/Integracoes";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ranking"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Ranking />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/nova-venda"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <NovaVenda />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calls"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Calls />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/metas"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Metas />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Admin />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/integracoes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Integracoes />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
);

export default App;
