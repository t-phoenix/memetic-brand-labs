export default function JsonBlock({ data }) {
  return (
    <pre className="admin-json">{JSON.stringify(data, null, 2)}</pre>
  );
}
