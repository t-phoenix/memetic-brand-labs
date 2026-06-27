import Navbar from './Navbar';

/** Shared shell for Narrative Engine routes — navbar always visible on peach background */
export default function NeLayout({ children }) {
  return (
    <div className="ne-shell">
      <Navbar className="navbar visible who-section-active" />
      <main className="ne-shell__main">{children}</main>
    </div>
  );
}
