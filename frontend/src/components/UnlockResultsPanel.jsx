import NarrativeAccessPanel from './NarrativeAccessPanel';

/** Legacy post-completion unlock — delegates to NarrativeAccessPanel */
export default function UnlockResultsPanel({ runId, onUnlocked }) {
  return <NarrativeAccessPanel mode="unlock" runId={runId} onSuccess={onUnlocked} />;
}
