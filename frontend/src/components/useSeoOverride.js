import { useContext } from 'react';
import { SeoContext } from './SeoContext';

export function useSeoOverride() {
  const context = useContext(SeoContext);
  if (!context) {
    throw new Error('useSeoOverride must be used within SeoProvider');
  }
  return context;
}
