const COLOR_MAP = {
  green: 'ne-card--green',
  yellow: 'ne-card--yellow',
  brown: 'ne-card--brown',
  red: 'ne-card--red',
};

export default function OutputCardsPreview({ outputs = [] }) {
  if (!outputs.length) {
    return <p className="admin-empty">No result cards yet — the run may still be in progress.</p>;
  }

  return (
    <div className="ne-cards">
      {outputs.map((card) => {
        const color = card.meta?.color ?? 'green';
        return (
          <article key={card.card_key ?? card.key} className={`ne-card ${COLOR_MAP[color] ?? 'ne-card--green'}`}>
            <h3>{card.card_label ?? card.label}</h3>
            <p>{card.content}</p>
          </article>
        );
      })}
    </div>
  );
}
