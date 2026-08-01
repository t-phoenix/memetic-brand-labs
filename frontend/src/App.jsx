import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GoogleAnalytics from './components/GoogleAnalytics';
import SeoProvider from './components/SeoProvider';
import SupabaseAuthRedirect from './components/SupabaseAuthRedirect';
import { NarrativePrivyProvider } from './components/NarrativePrivyProvider';
import LandingPage from './components/LandingPage';
import ApplicationForm from './components/ApplicationForm';
import NarrativeEngineRedirect from './pages/NarrativeEngineRedirect';
import NarrativeAuthorizePage from './pages/NarrativeAuthorizePage';
import NarrativeLoadingPage from './pages/NarrativeLoadingPage';
import NarrativeResultsPage from './pages/NarrativeResultsPage';
import NarrativeVerifyEmailPage from './pages/NarrativeVerifyEmailPage';
import SharedResultPage from './pages/SharedResultPage';
import AdminApp from './admin/AdminApp';
import './App.css';

function App() {
  return (
    <NarrativePrivyProvider>
    <Router>
      <GoogleAnalytics />
      <SupabaseAuthRedirect />
      <SeoProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/application-form" element={<ApplicationForm />} />
          <Route path="/narrative-engine" element={<NarrativeEngineRedirect />} />
          <Route path="/narrative-engine/authorize" element={<NarrativeAuthorizePage />} />
          <Route path="/narrative-engine/run/:id" element={<NarrativeLoadingPage />} />
          <Route path="/narrative-engine/run/:id/results" element={<NarrativeResultsPage />} />
          <Route path="/narrative-engine/verify-email" element={<NarrativeVerifyEmailPage />} />
          <Route path="/results/:shareId" element={<SharedResultPage />} />
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </div>
      </SeoProvider>
    </Router>
    </NarrativePrivyProvider>
  );
}

export default App;
