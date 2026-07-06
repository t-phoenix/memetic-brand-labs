export default function AdminPageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <header className="admin-page__header">
      {eyebrow && <div className="ne-eyebrow">{eyebrow}</div>}
      <h1 className="admin-page__title">{title}</h1>
      {subtitle && <p className="admin-page__subtitle">{subtitle}</p>}
      {children}
    </header>
  );
}
