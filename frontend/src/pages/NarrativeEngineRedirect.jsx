import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** /narrative-engine → landing form section */
export default function NarrativeEngineRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/', { replace: true, state: { scrollTo: 'narrative-engine' } });
  }, [navigate]);
  return null;
}
