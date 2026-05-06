'use client'

import { useState, useMemo } from 'react'
import Sidebar      from '../components/Sidebar'
import ArticleCard  from '../components/ArticleCard'
import ArticleModal from '../components/ArticleModal'

export default function HomeClient({ articles, categories }) {
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch]                 = useState('')
  const [selected, setSelected]             = useState(null)

  const filtered = useMemo(() => {
    return articles.filter(a => {
      const matchCat  = !activeCategory || a.category === activeCategory
      const q         = search.toLowerCase()
      const matchSearch = !q ||
        a.title?.toLowerCase().includes(q) ||
        a.excerpt?.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q)) ||
        a.category?.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [articles, activeCategory, search])

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
          <div className="topbar-title">
            {activeCategory || 'All Articles'}
            <span style={{color:'var(--muted)', fontWeight:400, marginLeft:'6px', fontSize:'13px'}}>
              — {filtered.length} article{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search articles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
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
            <div className="val">
              {[...new Set(articles.map(a => a.author).filter(Boolean))].length}
            </div>
            <div className="lbl">Contributors</div>
          </div>
          <div className="stat-card">
            <div className="val">
              {articles.reduce((s,a) => s + (a.views||0), 0)}
            </div>
            <div className="lbl">Total Views</div>
          </div>
        </div>

        {/* Grid */}
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
