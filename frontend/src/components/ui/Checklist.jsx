// items: [{ title, note, status: 'done' | 'current' | 'todo', action }]
function Checklist({ items }) {
  return (
    <ol className="v-checklist">
      {items.map((item, index) => (
        <li key={item.title} className={`v-check-row v-check-row--${item.status}`} aria-current={item.status === 'current' ? 'step' : undefined}>
          <span className="v-box" aria-hidden="true">{item.status === 'done' ? '' : index + 1}</span>
          <div>
            <div className="v-check-title">
              {item.status === 'done' && <span className="v-sr">Done: </span>}
              {item.title}
            </div>
            {item.note && <div className="v-check-note">{item.note}</div>}
            {item.action && <div className="v-actions">{item.action}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default Checklist;
