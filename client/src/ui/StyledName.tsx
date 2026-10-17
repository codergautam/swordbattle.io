import React, { useRef } from 'react';
import {
  NameStyle,
  ColorValue,
  isGradient,
  gradientUnitVector,
  outlineWidthPx,
} from '../game/nameStyles';

interface StyledNameProps {
  name: string;
  style?: NameStyle | null;
  fontSize: number;
  className?: string;
  extraStyle?: React.CSSProperties;
}

let measureCanvas: HTMLCanvasElement | null = null;
function measureTextWidth(text: string, fontSize: number): number {
  if (typeof document === 'undefined') return text.length * fontSize * 0.6;
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return text.length * fontSize * 0.6;
  ctx.font = `700 ${fontSize}px 'Saira', sans-serif`;
  return ctx.measureText(text).width;
}

let svgUid = 0;

function paint(c: ColorValue, id: string): { ref: string; def: React.ReactNode } {
  if (!isGradient(c)) return { ref: c, def: null };
  const v = gradientUnitVector(c.angle);
  return {
    ref: `url(#${id})`,
    def: (
      <linearGradient id={id} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>
        {[...c.stops]
          .sort((a, b) => a.pos - b.pos)
          .map((s, i) => (
            <stop key={i} offset={`${s.pos * 100}%`} stopColor={s.color} />
          ))}
      </linearGradient>
    ),
  };
}

function StyledName({ name, style, fontSize, className, extraStyle }: StyledNameProps) {
  const idRef = useRef<number>();
  if (idRef.current === undefined) idRef.current = ++svgUid;
  const id = idRef.current;

  if (!style) {
    return (
      <span className={className} style={extraStyle}>
        {name}
      </span>
    );
  }

  const { fill, outline, shadow } = style;
  const anyGradient = isGradient(fill) || isGradient(outline) || isGradient(shadow);
  const strokeW = outline ? outlineWidthPx(style.outlineWidth, fontSize) : 0;

  if (!anyGradient) {
    const css: React.CSSProperties = { ...extraStyle, color: fill as string };
    if (outline) {
      css.WebkitTextStrokeWidth = `${strokeW}px`;
      css.WebkitTextStrokeColor = outline as string;
      css.paintOrder = 'stroke fill';
    }
    if (shadow) {
      const b = fontSize * 0.14;
      css.textShadow = `0 0 ${b}px ${shadow as string}, 0 0 ${b}px ${shadow as string}`;
    }
    return (
      <span className={className} style={css}>
        {name}
      </span>
    );
  }

  const blur = shadow ? fontSize * 0.14 : 0;
  const textW = measureTextWidth(name, fontSize);
  const padX = Math.ceil(strokeW + blur + 3);
  const w = Math.ceil(textW) + padX * 2;
  const h = Math.ceil(fontSize * 1.25);
  const cx = w / 2;
  const cy = h / 2;
  const fp = paint(fill, `nm-f${id}`);
  const op = outline ? paint(outline, `nm-o${id}`) : null;
  const sp = shadow ? paint(shadow, `nm-s${id}`) : null;
  const textAttrs = {
    x: cx,
    y: cy,
    textAnchor: 'middle' as const,
    dominantBaseline: 'central' as const,
    fontFamily: "'Saira', sans-serif",
    fontWeight: 700,
    fontSize,
    paintOrder: 'stroke fill',
  };

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={{ ...extraStyle, display: 'inline-block', verticalAlign: 'middle', overflow: 'visible' }}
    >
      <defs>
        {fp.def}
        {op?.def}
        {sp?.def}
        {shadow && (
          <filter id={`nm-b${id}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={blur} />
          </filter>
        )}
      </defs>
      {shadow && (
        <text {...textAttrs} fill={sp!.ref} filter={`url(#nm-b${id})`}>
          {name}
        </text>
      )}
      <text
        {...textAttrs}
        {...(outline
          ? { stroke: op!.ref, strokeWidth: strokeW, strokeLinejoin: 'round' as const, paintOrder: 'stroke' as const }
          : {})}
        fill={fp.ref}
      >
        {name}
      </text>
    </svg>
  );
}

export default StyledName;
