import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ApplicationForm from './components/ApplicationForm';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/application-form" element={<ApplicationForm />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
