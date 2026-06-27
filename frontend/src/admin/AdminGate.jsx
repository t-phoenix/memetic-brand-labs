import { useState } from 'react';
import { setAdminKey, adminFetch } from './lib/adminApi';

export default function AdminGate() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setAdminKey(key.trim());
    try {
      await adminFetch('/v1/admin/health');
      window.location.reload();
    } catch (err) {
      setError(err.message ?? 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-gate">
      <form className="admin-gate__card" onSubmit={handleSubmit}>
        <h1 className="admin-gate__title">Narrative Engine Admin</h1>
        <p className="admin-gate__desc">Enter your admin API key to continue.</p>
        {error && <p className="admin-gate__error">{error}</p>}
        <input
          className="admin-gate__input"
          type="password"
          placeholder="X-Admin-Key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
          required
        />
        <button className="admin-gate__btn" type="submit" disabled={loading}>
          {loading ? 'Verifying…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
