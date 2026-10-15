export default function BalloonVisual({ color, size = 120, className = '' }) {
  return (
    <div
      className={`balloon-visual ${className}`}
      style={{
        width: size,
        height: size * 1.35,
        '--body': color.body,
        '--shine': color.shine,
      }}
      aria-hidden="true"
    >
      <span className="balloon-visual__body">
        <span className="balloon-visual__shine" />
      </span>
      <span className="balloon-visual__knot" />
      <span className="balloon-visual__string" />
    </div>
  )
}
