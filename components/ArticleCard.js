'use client'

const AVATAR_COLORS = ['#e8504a','#e8a838','#48c78e','#6ea8fe','#b06ae8','#e8704a','#4ac7c7']

function relDate(iso) {
  const d = new Date(iso), now = new Date()
  const m = Math.round((now - d) / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return 'Today'
  const dy = Math.round(h / 24)
  if (dy === 1) return 'Yesterday'
  if (dy < 30) return `${dy}d ago`
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' })
}

export default function ArticleCard({ article, categories, onClick }) {
  const cat = categories.find(c => c.name === article.category) || {}
  const avatarColor = AVATAR_COLORS[article.id % AVATAR_COLORS.length]

  return (
    <div className="article-card" onClick={() => onClick(article)}>
      {/* Category badge */}
      <div>
        <span className="card-cat" style={{
          background: cat.bg || 'rgba(255,255,255,0.05)',
          color: cat.color || 'var(--muted)',
          border: `1px solid ${cat.color || 'var(--border)'}22`
        }}>
          {article.category}
        </span>
      </div>

      {/* Title */}
      <div className="card-title">{article.title}</div>

      {/* Excerpt */}
      {article.excerpt && (
        <div className="card-excerpt">{article.excerpt.slice(0, 120)}{article.excerpt.length > 120 ? '…' : ''}</div>
      )}

      {/* Tags */}
      {article.tags?.length > 0 && (
        <div className="card-tags">
          {article.tags.slice(0, 3).map(t => (
            <span key={t} className="tag">#{t}</span>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="card-meta">
        <div className="card-avatar" style={{background: avatarColor}}>
          {article.initials || '?'}
        </div>
        <span className="card-author">{article.author}</span>
        <span className="card-date">{relDate(article.created_at)}</span>
      </div>
    </div>
  )
}
