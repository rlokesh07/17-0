// spinner.jsx — generic radial spinner. Parent picks the landing index; the wheel
// does a multi-turn decelerating spin to it. Used for both the team & year wheels.

function _polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}
function _slice(cx, cy, r, a0, a1) {
  const [x0, y0] = _polar(cx, cy, r, a0);
  const [x1, y1] = _polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

const Wheel = React.forwardRef(function Wheel(
  { items, size = 150, segFill, accent = '#22d3a8', onRest, hub, label }, ref
) {
  const n = items.length;
  const seg = 360 / n;
  const DUR = 1500; // ms — must match the CSS transition below
  const [rotation, setRotation] = React.useState(-seg / 2);
  const [spinning, setSpinning] = React.useState(false);
  const [landed, setLanded] = React.useState(null);
  const rotRef = React.useRef(-seg / 2);
  const timer = React.useRef(null);

  React.useImperativeHandle(ref, () => ({
    spinTo(index, turns = 5) {
      setLanded(null);
      setSpinning(true);
      const centerAngle = index * seg + seg / 2;
      const targetMod = ((360 - centerAngle) % 360 + 360) % 360;
      const curMod = ((rotRef.current % 360) + 360) % 360;
      let delta = targetMod - curMod;
      if (delta <= 0) delta += 360;
      const next = rotRef.current + 360 * turns + delta;
      rotRef.current = next;
      setRotation(next);
      // resolve via a guaranteed timer with the known index (transitionend is
      // unreliable when the frame isn't actively painting)
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setSpinning(false);
        setLanded(index);
        onRest && onRest(index);
      }, DUR + 60);
    },
    isSpinning: () => spinning,
  }));
  React.useEffect(() => () => clearTimeout(timer.current), []);

  const cx = size / 2, cy = size / 2, R = size / 2 - 4;
  const hubR = Math.max(26, size * 0.22);

  return (
    <div style={{ position: 'relative', width: size, height: size + (label ? 22 : 0), margin: '0 auto' }}>
      {label && <div style={{
        fontFamily: '"IBM Plex Mono",monospace', fontSize: 10, letterSpacing: 2,
        textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center', marginBottom: 6,
      }}>{label}</div>}
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* glow */}
        <div style={{
          position: 'absolute', inset: -5, borderRadius: '50%',
          background: `radial-gradient(circle at 50% 40%, ${accent}22, transparent 70%)`, filter: 'blur(4px)',
        }} />
        {/* pointer */}
        <svg width="24" height="22" viewBox="0 0 34 30" style={{
          position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', zIndex: 5,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))',
        }}>
          <path d="M17 28 L4 4 Q17 12 30 4 Z" fill={accent} />
        </svg>

        <svg
          width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: `transform ${DUR / 1000}s cubic-bezier(0.17,0.85,0.16,1)`,
            display: 'block',
          }}
        >
          <circle cx={cx} cy={cy} r={R + 2} fill="#0b1118" stroke="#1e2937" strokeWidth="1.5" />
          {items.map((it, i) => {
            const a0 = i * seg, a1 = (i + 1) * seg;
            const isLanded = landed === i;
            return (
              <path key={i} d={_slice(cx, cy, R, a0, a1)}
                fill={segFill(it, i)}
                stroke="#0b1118" strokeWidth={n > 16 ? 0.75 : 1.5}
                opacity={landed == null ? 0.92 : (isLanded ? 1 : 0.28)} />
            );
          })}
          {/* hub ring */}
          <circle cx={cx} cy={cy} r={hubR + 3} fill="#0b1118" stroke={accent} strokeWidth="2" />
        </svg>

        {/* non-rotating hub content */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: hubR * 2, height: hubR * 2, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, pointerEvents: 'none',
        }}>
          {hub(landed == null ? null : landed, spinning)}
        </div>
      </div>
    </div>
  );
});

window.Wheel = Wheel;
