import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GoogleAnalytics from './components/GoogleAnalytics';
import LandingPage from './components/LandingPage';
import ApplicationForm from './components/ApplicationForm';
import NarrativeEngineRedirect from './pages/NarrativeEngineRedirect';
import NarrativeLoadingPage from './pages/NarrativeLoadingPage';
import NarrativeResultsPage from './pages/NarrativeResultsPage';
import SharedResultPage from './pages/SharedResultPage';
import AdminApp from './admin/AdminApp';
import './App.css';

function App() {
  return (
    <Router>
      <GoogleAnalytics />
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/application-form" element={<ApplicationForm />} />
          <Route path="/narrative-engine" element={<NarrativeEngineRedirect />} />
          <Route path="/narrative-engine/run/:id" element={<NarrativeLoadingPage />} />
          <Route path="/narrative-engine/run/:id/results" element={<NarrativeResultsPage />} />
          <Route path="/results/:shareId" element={<SharedResultPage />} />
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
