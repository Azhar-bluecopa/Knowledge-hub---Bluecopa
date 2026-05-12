'use client'

export default function Sidebar({ categories, articles, activeCategory, onSelect, totalCount }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/bluecopa-logo.png" alt="Bluecopa" className="sidebar-logo-brand-img" />
        <h1>KnowledgeHub</h1>
      </div>

      <div className="sidebar-scroll">
        {/* Sidebar Search */}
        <div className="sidebar-search">
          <input type="text" placeholder="Search articles…" readOnly />
        </div>

        {/* All articles */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Browse</div>
          <div
            className={`category-item${!activeCategory ? ' active' : ''}`}
            onClick={() => onSelect(null)}
          >
            <span style={{fontSize:'14px'}}>📋</span>
            All Articles
            <span className="count-badge">{totalCount}</span>
          </div>
        </div>

        {/* Categories */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Categories</div>
          {categories.map((cat) => {
            const count = articles.filter(a => a.category === cat.name).length
            return (
              <div
                key={cat.name}
                className={`category-item${activeCategory === cat.name ? ' active' : ''}`}
                onClick={() => onSelect(cat.name)}
              >
                <span className="category-dot" style={{background: cat.color}} />
                {cat.name}
                <span className="count-badge">{count}</span>
              </div>
            )
          })}
        </div>

        {/* Analytics section removed — Dashboard moved to topbar */}
      </div>

      {/* New Article */}
      <div className="new-article-btn">
        ✦ New Article
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="avatar">A</div>
        <div>
          <div style={{color:'var(--text)', fontWeight:600, fontSize:'13px'}}>Azhar</div>
          <div style={{fontSize:'11px', marginTop:'1px'}}>
            <span className="online-dot" />live · synced
          </div>
        </div>
      </div>
    </aside>
  )
}
