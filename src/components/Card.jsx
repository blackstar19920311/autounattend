
/**
 * Lekerekített kártya komponens — Windows 11 stílusú
 * Árnyékkal, fejléccel és animált belépéssel
 */
export default function Card({ title, icon, children, id }) {
  return (
    <section className="card" id={id}>
      {title && (
        <div className="card-header">
          <span className="card-icon">{icon}</span>
          <h2 className="card-title">{title}</h2>
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </section>
  )
}
