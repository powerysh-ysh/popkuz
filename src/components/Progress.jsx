export default function Progress({ count, total }) {
  return (
    <div className="progress">
      <div
        className="pips"
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${total}마리 중 ${count}마리 획득`}
      >
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`pip${i < count ? ' on' : ''}`} />
        ))}
      </div>
      <div className="count">
        {count} / {total}
      </div>
    </div>
  )
}
