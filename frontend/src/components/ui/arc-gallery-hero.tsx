import { useEffect, useMemo, useState } from 'react'

type ArcGalleryHeroProps = {
  images: string[]
  startAngle?: number
  endAngle?: number
  radiusLg?: number
  radiusMd?: number
  radiusSm?: number
  cardSizeLg?: number
  cardSizeMd?: number
  cardSizeSm?: number
  className?: string
  motionMode?: 'static' | 'orbit'
  orbitDurationSec?: number
}

export default function ArcGalleryHero({
  images,
  startAngle = 20,
  endAngle = 160,
  radiusLg = 420,
  radiusMd = 320,
  radiusSm = 220,
  cardSizeLg = 116,
  cardSizeMd = 96,
  cardSizeSm = 78,
  className = '',
  motionMode = 'static',
  orbitDurationSec = 56,
}: ArcGalleryHeroProps) {
  const [dimensions, setDimensions] = useState({ radius: radiusLg, cardSize: cardSizeLg })
  const isOrbitMode = motionMode === 'orbit'

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) {
        setDimensions({ radius: radiusSm, cardSize: cardSizeSm })
      } else if (width < 1024) {
        setDimensions({ radius: radiusMd, cardSize: cardSizeMd })
      } else {
        setDimensions({ radius: radiusLg, cardSize: cardSizeLg })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [cardSizeLg, cardSizeMd, cardSizeSm, radiusLg, radiusMd, radiusSm])

  const safeImages = useMemo(() => images.filter(Boolean), [images])
  const renderedImages = useMemo(() => {
    if (!isOrbitMode) {
      return safeImages
    }
    if (safeImages.length === 0) {
      return []
    }
    const targetCount = Math.min(18, Math.max(14, safeImages.length))
    return Array.from({ length: targetCount }, (_, index) => safeImages[index % safeImages.length])
  }, [isOrbitMode, safeImages])

  const count = isOrbitMode ? renderedImages.length : Math.max(renderedImages.length, 2)
  const step = isOrbitMode
    ? (count > 0 ? 360 / count : 0)
    : (count > 1 ? (endAngle - startAngle) / (count - 1) : 0)

  return (
    <section className={`arc-gallery-shell ${className}`}>
      <div className="arc-gallery-geometry">
        <div
          className={isOrbitMode ? 'arc-gallery-pivot arc-gallery-pivot-orbit' : 'arc-gallery-pivot'}
          style={isOrbitMode ? { animationDuration: `${orbitDurationSec}s` } : undefined}
        >
          {renderedImages.map((src, i) => {
            const angle = isOrbitMode ? 90 + step * i : startAngle + step * i
            const angleRad = (angle * Math.PI) / 180
            const x = Math.cos(angleRad) * dimensions.radius
            const y = Math.sin(angleRad) * dimensions.radius
            const depth = Math.max(0, Math.min(1, (y + dimensions.radius) / (2 * dimensions.radius)))
            const orbitScale = 0.84 + depth * 0.26
            const orbitOpacity = 0.48 + depth * 0.52
            return (
              <div
                key={`${src}-${i}`}
                className={isOrbitMode ? 'arc-gallery-item arc-gallery-item-orbit' : 'arc-gallery-item'}
                style={{
                  width: dimensions.cardSize,
                  height: dimensions.cardSize,
                  left: `calc(50% + ${x}px)`,
                  bottom: `${y}px`,
                  transform: isOrbitMode
                    ? `translate(-50%, 50%) scale(${orbitScale})`
                    : 'translate(-50%, 50%)',
                  opacity: isOrbitMode ? orbitOpacity : undefined,
                  animationDelay: isOrbitMode ? undefined : `${i * 90}ms`,
                  zIndex: isOrbitMode ? Math.round(100 + depth * 100) : count - i,
                }}
              >
                <div
                  className={isOrbitMode ? 'arc-gallery-card arc-gallery-card-orbit' : 'arc-gallery-card'}
                  style={
                    isOrbitMode
                      ? { animationDuration: `${orbitDurationSec}s` }
                      : { transform: `rotate(${angle / 4}deg)` }
                  }
                >
                  <img
                    src={src}
                    alt={`template-${i + 1}`}
                    draggable={false}
                    className="arc-gallery-image"
                    onError={(event) => {
                      event.currentTarget.src = 'https://placehold.co/400x400/e6ebf8/4d607e?text=Template'
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
