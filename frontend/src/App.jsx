import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ApplicationForm from './components/ApplicationForm';
import NarrativeEnginePage from './pages/NarrativeEnginePage';
import NarrativeRunPage from './pages/NarrativeRunPage';
import SharedResultPage from './pages/SharedResultPage';
import AdminApp from './admin/AdminApp';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/application-form" element={<ApplicationForm />} />
          <Route path="/narrative-engine" element={<NarrativeEnginePage />} />
          <Route path="/narrative-engine/run/:id" element={<NarrativeRunPage />} />
          <Route path="/results/:shareId" element={<SharedResultPage />} />
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
