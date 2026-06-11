import type { GalleryClient } from '@/domain/persistence/galleryClient'
import { useGallery } from '@/hooks/useGallery'

interface GalleryProps {
  client?: GalleryClient
}

export function Gallery({ client }: GalleryProps) {
  const { builds, loading, loadingBuildId, error, mode, loadBuild } =
    useGallery(client)

  return (
    <section className="gallery-panel" aria-label="Published builds">
      <div className="gallery-panel__header">
        <h3>Gallery</h3>
        {mode === 'demo' && <span>Demo gallery</span>}
        <span>{builds.length} builds</span>
      </div>

      {loading && <p className="gallery-panel__state">Loading gallery...</p>}
      {error && <p className="gallery-panel__error">{error}</p>}
      {!loading && builds.length === 0 && !error && (
        <p className="gallery-panel__state">No published builds yet.</p>
      )}

      <div className="gallery-list">
        {builds.map((build) => (
          <article className="gallery-list__item" key={build.id}>
            <div>
              <h4>{build.title}</h4>
              <p>{build.author}</p>
              <span>
                {build.brickCount} {build.brickCount === 1 ? 'brick' : 'bricks'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void loadBuild(build.id)}
              disabled={loadingBuildId === build.id}
            >
              {loadingBuildId === build.id ? 'Loading...' : 'Load'}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
