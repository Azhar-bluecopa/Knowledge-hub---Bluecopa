'use client'

import { useState, useMemo } from 'react'
import Sidebar      from '../components/Sidebar'
import ArticleCard  from '../components/ArticleCard'
import ArticleModal from '../components/ArticleModal'

function todayCount(articles) {
  const today = new Date()
  return articles.filter(a => {
    if (!a.created_at) return false
    const d = new Date(a.created_at)
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth()    === today.getMonth()    &&
           d.getDate()     === today.getDate()
  }).length
}

export default function HomeClient({ articles, categories, settings }) {
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch]                 = useState('')
  const [searchOpen, setSearchOpen]         = useState(false)
  const [selected, setSelected]             = useState(null)

  const sorted = useMemo(() =>
    [...articles].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [articles]
  )

  const filtered = useMemo(() => {
    return sorted.filter(a => {
      const matchCat    = !activeCategory || a.category === activeCategory
      const q           = search.toLowerCase()
      const matchSearch = !q ||
        a.title?.toLowerCase().includes(q) ||
        a.excerpt?.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q)) ||
        a.category?.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [sorted, activeCategory, search])

  const uniqueAuthors = [...new Set(articles.map(a => a.author).filter(Boolean))].length
  const addedToday    = todayCount(articles)

  const pageTitle = activeCategory || 'All Articles'

  return (
    <div className="layout">
      <Sidebar
        categories={categories}
        articles={articles}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
        totalCount={articles.length}
      />

      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-title-group">
            <div className="topbar-title">{pageTitle}</div>
            <div className="topbar-meta">Browse and manage your team's knowledge base</div>
          </div>

          <div className="topbar-actions">
            {/* Search */}
            {searchOpen ? (
              <div className="search-wrap-topbar">
                <span style={{color:'var(--muted)', fontSize:'15px', flexShrink:0}}>🔍</span>
                <input
                  autoFocus
                  type="text"
                  placeholder="Search articles…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onBlur={() => { if (!search) setSearchOpen(false) }}
                />
                {search && (
                  <button
                    style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:'16px',padding:'0 4px'}}
                    onClick={() => { setSearch(''); setSearchOpen(false) }}
                  >✕</button>
                )}
              </div>
            ) : (
              <button className="search-icon-btn" onClick={() => setSearchOpen(true)}>
                🔍 Search
              </button>
            )}

            <button className="btn-about">ℹ About</button>
            <button className="btn-ghost">↑ Export</button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="val">{articles.length}</div>
            <div className="lbl">Total Articles</div>
          </div>
          <div className="stat-card">
            <div className="val">{categories.length}</div>
            <div className="lbl">Categories</div>
          </div>
          <div className="stat-card">
            <div className="val">{uniqueAuthors}</div>
            <div className="lbl">Contributors</div>
          </div>
          <div className="stat-card">
            <div className="val">{addedToday}</div>
            <div className="lbl">Added Today</div>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          <div className="section-header">
            <div className="section-title">
              {activeCategory ? `${activeCategory} Articles` : 'Recent Articles'}
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="articles-grid">
              {filtered.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  categories={categories}
                  onClick={setSelected}
                />
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="icon">📭</div>
              <p>No articles found{search ? ` for "${search}"` : ''}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Article modal */}
      {selected && (
        <ArticleModal
          article={selected}
          categories={categories}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
