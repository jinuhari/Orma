export function SplashScreen({ leaving = false }: { leaving?: boolean }) {
  return (
    <main
      className={`orma-splash${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-label="Loading Orma"
    >
      <img
        className="splash-art"
        src="/brand/orma-splash-1672.webp"
        srcSet="/brand/orma-splash-960.webp 960w, /brand/orma-splash-1672.webp 1672w"
        sizes="100vw"
        alt=""
        decoding="async"
        draggable={false}
      />
      <div className="splash-copy">
        <p className="splash-word">orma</p>
        <span className="splash-caption">A little space to find your way</span>
        <span className="splash-progress" aria-hidden="true" />
      </div>
    </main>
  )
}
