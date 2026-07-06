export default function AdminEmptyState({ title, message, action }) {
  return (
    <div className="admin-empty">
      <div className="admin-empty__title">{title}</div>
      <p>{message}</p>
      {action}
    </div>
  );
}
