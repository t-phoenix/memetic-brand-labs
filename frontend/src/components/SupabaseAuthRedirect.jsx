import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { buildVerifyEmailPathFromHash, consumeMagicLinkHash } from '../lib/magicLinkCallback';

/** Routes Supabase magic-link hash tokens to the verify-email page when redirect URL was not allowlisted. */
export default function SupabaseAuthRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const target = buildVerifyEmailPathFromHash();
    if (!target) return;

    const search = location.search;
    const path = location.pathname;

    if (path === '/narrative-engine/verify-email') {
      void consumeMagicLinkHash().catch(() => undefined);
      return;
    }

    navigate(`${target}${search}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

  return null;
}
