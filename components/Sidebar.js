'use client'

const AVATAR_COLORS = ['#e8504a','#e8a838','#48c78e','#6ea8fe','#b06ae8','#e8704a','#4ac7c7']

export default function Sidebar({ categories, articles, activeCategory, onSelect, totalCount }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-text">📚 KnowledgeHub</div>
        <div style={{fontSize:'11px', color:'var(--muted)', marginTop:'4px'}}>Bluecopa Delivery Org</div>
      </div>

      {/* All articles */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Browse</div>
        <div
          className={`cat-item${!activeCategory ? ' active' : ''}`}
          onClick={() => onSelect(null)}
        >
          <span style={{fontSize:'14px'}}>📋</span>
          All Articles
          <span className="cat-count">{totalCount}</span>
        </div>
      </div>

      {/* Categories */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Categories</div>
        {categories.map((cat, idx) => {
          const count = articles.filter(a => a.category === cat.name).length
          return (
            <div
              key={cat.name}
              className={`cat-item${activeCategory === cat.name ? ' active' : ''}`}
              onClick={() => onSelect(cat.name)}
            >
              <span className="cat-dot" style={{background: cat.color}}/>
              {cat.name}
              <span className="cat-count">{count}</span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
