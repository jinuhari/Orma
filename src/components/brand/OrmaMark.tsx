// The theme artwork: the four life areas as a neural map. Used on splash, sign-in and the website.
export function OrmaMark({ className = '' }: { className?: string }) {
  return (
    <div className={`orma-map ${className}`.trim()} aria-hidden="true">
      <img
        src="/brand/orma-brain-1462.webp"
        srcSet="/brand/orma-brain-800.webp 800w, /brand/orma-brain-1462.webp 1462w"
        sizes="(max-width: 860px) 90vw, 640px"
        width={1462}
        height={1076}
        alt=""
        decoding="async"
        draggable={false}
      />
    </div>
  )
}
