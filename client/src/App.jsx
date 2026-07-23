import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TransferForm } from "./components/TransferForm";
import { UserLayout } from "./layout/UserLayout";
import { Dashboard } from "./pages/Dashboard";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { TransactionHistory } from "./pages/TransactionHistory";
import { TransferDetails } from "./pages/TransferDetails";
import { TransferFunds } from "./pages/TransferFunds";
import { CreateAccountForm } from "./components/CreateAccountForm";
import { SecuritySettings } from "./pages/SecuritySettings";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />

        {/* Protected User Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/user" element={<UserLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="create-account" element={<CreateAccountForm />} />
            <Route path="transactions" element={<TransactionHistory />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="transferfunds" element={<TransferFunds />}>
              <Route path="form" element={<TransferForm />} />
            </Route>
            <Route
              path="/user/transferfunds/details"
              element={<TransferDetails />}
            />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="/" element={<SignInPage />} />
        <Route path="*" element={<SignInPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
