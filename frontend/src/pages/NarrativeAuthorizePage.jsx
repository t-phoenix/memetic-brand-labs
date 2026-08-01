import { useNavigate, useLocation } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import NarrativeAccessPanel from '../components/NarrativeAccessPanel';
import { clearPendingIntake, resolveAuthorizeIntake } from '../lib/pendingIntake';
import './NarrativeFlow.css';

export default function NarrativeAuthorizePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const intake = resolveAuthorizeIntake(location.state?.intake);

  if (!intake?.building) {
    return (
      <div className="ne-flow ne-flow--auth">
        <SiteNav tone="cream" />
        <main className="ne-flow__main">
          <p className="ne-flow__error">Missing form data. Please start from the Narrative Engine form.</p>
          <button type="button" className="ne-flow__pill" onClick={() => navigate('/#narrative-engine')}>
            Back to form
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="ne-flow ne-flow--auth">
      <SiteNav tone="cream" />
      <main className="ne-flow__main">
        <NarrativeAccessPanel
          mode="pre_run"
          intake={intake}
          onSuccess={(result) => {
            clearPendingIntake();
            navigate(`/narrative-engine/run/${result.run_id}`, { replace: true });
          }}
        />
      </main>
    </div>
  );
}
