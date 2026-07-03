import FluentHelpIcon from './FluentHelpIcon';

/**
 * Lekerekített kártya komponens — Windows 11 stílusú
 * Árnyékkal, fejléccel és animált belépéssel
 */
export default function Card({ title, icon, tooltip, children, id }) {
  return (
    <section className="card" id={id}>
      {title && (
        <div className="card-header">
          <span className="card-icon">{icon}</span>
          <h2 className="card-title">{title}</h2>
          {tooltip && (
            <div className="tooltip-container">
              <FluentHelpIcon size={20} />
              <div className="tooltip-text">{tooltip}</div>
            </div>
          )}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </section>
  )
}
