import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { applySeo, getRouteSeo } from '../lib/seo';
import { SeoContext } from './SeoContext';

export default function SeoProvider({ children }) {
  const { pathname } = useLocation();
  const [overrideState, setOverrideState] = useState({ pathname: '', seo: null });

  const routeSeo = useMemo(() => getRouteSeo(pathname), [pathname]);

  const effectiveSeo = useMemo(() => {
    if (overrideState.pathname === pathname && overrideState.seo) {
      return overrideState.seo;
    }
    return routeSeo;
  }, [overrideState, pathname, routeSeo]);

  const setOverride = useCallback((seo) => {
    setOverrideState({ pathname, seo });
  }, [pathname]);

  useEffect(() => {
    applySeo(effectiveSeo);
  }, [effectiveSeo]);

  return (
    <SeoContext.Provider value={{ setOverride }}>
      {children}
    </SeoContext.Provider>
  );
}
