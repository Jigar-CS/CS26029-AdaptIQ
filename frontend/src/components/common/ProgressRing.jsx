/**
 * Circular progress ring used for the Placement Readiness Hub gauge.
 */
const ProgressRing = ({
  value = 0,
  size = 160,
  strokeWidth = 12,
  label = 'PLACEMENT INDEX',
  color = '#4A3728',
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EDE6DC"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={clamped > 0 ? color : '#DDD4C7'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color: '#241C16', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {Math.round(clamped)}
        </span>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8C8074', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6 }}>
          {label}
        </span>
      </div>
    </div>
  );
};

export default ProgressRing;
