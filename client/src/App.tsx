import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
//import RecordUI from "@/components/uiRecordLinkage";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/layouts/mainLayouts";
import Home from "@/pages/home";
import { UserProvider } from "./context/userContext";
import AuthForm from "@/components/authForm";
import { useUser } from "@/context/userContext";
import PrivacyPolicy from "./components/privacyPolicy";
import BetaTerms from "./components/termsOfService";

/* ---------- Router ---------- */
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* <Route path="/record-linkage/:id" component={RecordUI} /> */}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={BetaTerms} />
      <Route component={NotFound} />
    </Switch>
  );
}

/* ---------- Wrapper with Auth Modal ---------- */
function AppWithProviders() {
  const { showAuthModal, closeAuthModal } = useUser();

  return (
    <MainLayout>
      <Router />
      {showAuthModal && (
        <AuthForm
          onClose={closeAuthModal}
          onAuthSuccess={closeAuthModal}
        />
      )}
    </MainLayout>
  );
}

/* ---------- App Root ---------- */
function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <AppWithProviders />
          </TooltipProvider>
        </UserProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
