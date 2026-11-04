import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

// Layouts & Guards
import GlobalLayout from './components/GlobalLayout';
import AuthRoute from './components/AuthRoute';
import AppLayout from './components/AppLayout';

// Pages
import Login from './pages/Login';
import InvoiceList from './pages/app/InvoiceList';
import InvoiceDetails from './pages/app/InvoiceDetails';
import TeamAssignment from './pages/app/TeamAssignment';
import Users from './pages/settings/Users';
import Configuration from './pages/settings/Configuration';
import IntegrationList from './pages/settings/integrations/IntegrationList';
import IntegrationDetail from './pages/settings/integrations/IntegrationDetail';
import EmailConfigurationForm  from './pages/settings/email/EmailConfigurationForm';
import { APPS } from './utils/appHelper';

const SmartRedirect = () => {
  const { user, getDefaultRoute } = React.useContext(AuthContext);
  return <Navigate to={getDefaultRoute(user)} replace />;
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <AuthRoute>
                    <GlobalLayout />
                  </AuthRoute>
                }
              >
                <Route index element={<SmartRedirect />} />

                {/*
                  General Payments, SJO Invoice Processing, ROSPBU Invoice Processing - same pages each:
                    invoices             Invoice list with pagination, filter and search
                    invoices/:invoiceId  Invoice details with PDF preview
                    team                 Team assignment: add & remove users (admin)
                */}
                {APPS.map((app) => (
                  <Route key={app.id} path={`app/${app.id}`} element={<AuthRoute requireApp={app.id}><AppLayout /></AuthRoute>}>
                    <Route index element={<Navigate to="invoices" replace />} />
                    <Route path="invoices" element={<InvoiceList />} />
                    <Route path="invoices/:invoiceId" element={<InvoiceDetails />} />
                    <Route path="team" element={<AuthRoute requireAdmin={true}><TeamAssignment /></AuthRoute>} />
                  </Route>
                ))}

                {/* Settings (Admin Role Required): Users + Configuration (master data) + SAP / OnBase Configuration (integrations) */}
                <Route path="settings" element={<AuthRoute requireAdmin={true} />}>
                  <Route index element={<Navigate to="users" replace />} />
                  <Route path="users" element={<Users />} />
                  <Route path="configuration" element={<Configuration />} />
                  <Route path="configuration/:entity" element={<Configuration />} />
                  <Route path="sap-configuration" element={<IntegrationList providerType="sap-odata" />} />
                  <Route path="sap-configuration/:id" element={<IntegrationDetail providerType="sap-odata" />} />
                  <Route path="sap-configuration/:id/:tab" element={<IntegrationDetail providerType="sap-odata" />} />
                  <Route path="onbase-configuration" element={<IntegrationList providerType="onbase-rest" />} />
                  <Route path="onbase-configuration/:id" element={<IntegrationDetail providerType="onbase-rest" />} />
                  <Route path="onbase-configuration/:id/:tab" element={<IntegrationDetail providerType="onbase-rest" />} />
                  <Route path="email-configuration" element={<EmailConfigurationForm />} />
                  <Route path="email-configuration/:tab" element={<EmailConfigurationForm />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
