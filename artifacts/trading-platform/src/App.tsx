import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Trading from "@/pages/Trading";
import Managers from "@/pages/Managers";
import P2P from "@/pages/P2P";
import WalletPage from "@/pages/WalletPage";
import BuyAssets from "@/pages/BuyAssets";
import Support from "@/pages/Support";
import Messages from "@/pages/Messages";
import KYC from "@/pages/KYC";
import Notifications from "@/pages/Notifications";
import Cards from "@/pages/Cards";
import DemoTrading from "@/pages/DemoTrading";
import Admin from "@/pages/Admin";
import Programs from "@/pages/Programs";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import AdminLogin from "@/pages/auth/AdminLogin";
import SecuritySetup from "@/pages/auth/SecuritySetup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/register" component={Register} />
      <Route path="/auth/security-setup" component={SecuritySetup} />
      <Route path="/auth/forgot-password" component={ForgotPassword} />
      <Route path="/auth/admin" component={AdminLogin} />
      <Route path="/c-panel" component={Admin} />

      <Route>
        {() => (
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/trading" component={Trading} />
              <Route path="/managers" component={Managers} />
              <Route path="/p2p" component={P2P} />
              <Route path="/programs" component={Programs} />
              <Route path="/wallet" component={WalletPage} />
              <Route path="/buy" component={BuyAssets} />
              <Route path="/support" component={Support} />
              <Route path="/messages" component={Messages} />
              <Route path="/kyc" component={KYC} />
              <Route path="/notifications" component={Notifications} />
              <Route path="/cards" component={Cards} />
              <Route path="/demo" component={DemoTrading} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
