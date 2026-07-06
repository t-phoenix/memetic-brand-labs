import { useState } from 'react';
import JsonBlock from './JsonBlock.jsx';

export default function JsonToggle({ data, label = 'Show technical details' }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  return (
    <div style={{ marginTop: '0.75rem' }}>
      <button type="button" className="admin-btn" onClick={() => setOpen(!open)}>
        {open ? 'Hide technical details' : label}
      </button>
      {open && <JsonBlock data={data} />}
    </div>
  );
}
