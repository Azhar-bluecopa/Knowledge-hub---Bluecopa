'use client'

import { useEffect } from 'react'
import ContentRenderer from './ContentRenderer'

const AVATAR_COLORS = ['#e8504a','#e8a838','#48c78e','#6ea8fe','#b06ae8','#e8704a','#4ac7c7']

function relDate(iso) {
  const d = new Date(iso), now = new Date()
  const dy = Math.round((now - d) / 86400000)
  if (dy === 0) return 'Today'
  if (dy === 1) return 'Yesterday'
  if (dy < 30) return `${dy}d ago`
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
}

export default function ArticleModal({ article, categories, onClose }) {
  const cat = categories.find(c => c.name === article.category) || {}
  const avatarColor = AVATAR_COLORS[article.id % AVATAR_COLORS.length]

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
        zIndex:1000, display:'flex', alignItems:'flex-start',
        justifyContent:'center', padding:'40px 16px', overflowY:'auto'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:'14px', width:'100%', maxWidth:'780px',
        maxHeight:'90vh', overflowY:'auto', position:'relative'
      }}>
        {/* Modal header */}
        <div style={{
          padding:'20px 24px 16px', borderBottom:'1px solid var(--border)',
          position:'sticky', top:0, background:'var(--surface)', zIndex:1,
          display:'flex', alignItems:'flex-start', gap:'12px'
        }}>
          <div style={{flex:1}}>
            <div style={{fontSize:'20px', fontWeight:700, lineHeight:1.3, marginBottom:'12px'}}>
              {article.title}
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
              <span style={{
                fontSize:'11px', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase',
                padding:'3px 10px', borderRadius:'20px',
                background: cat.bg || 'rgba(255,255,255,0.05)',
                color: cat.color || 'var(--muted)',
              }}>
                {article.category}
              </span>
              <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                <div style={{
                  width:'24px', height:'24px', borderRadius:'50%', background:avatarColor,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'10px', fontWeight:700, color:'#fff'
                }}>
                  {article.initials}
                </div>
                <span style={{fontSize:'13px', color:'var(--muted)'}}>{article.author}</span>
              </div>
              <span style={{fontSize:'13px', color:'var(--muted)', marginLeft:'auto'}}>
                {relDate(article.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width:'32px', height:'32px', borderRadius:'8px', background:'var(--surface2)',
              color:'var(--muted)', fontSize:'18px', display:'flex',
              alignItems:'center', justifyContent:'center', flexShrink:0
            }}
          >×</button>
        </div>

        {/* Content */}
        <div style={{padding:'24px'}}>
          <ContentRenderer content={article.content}/>

          {/* Tags */}
          {article.tags?.length > 0 && (
            <div style={{
              marginTop:'32px', paddingTop:'20px', borderTop:'1px solid var(--border)',
              display:'flex', gap:'8px', flexWrap:'wrap'
            }}>
              {article.tags.map(t => (
                <span key={t} style={{
                  fontSize:'12px', background:'var(--surface2)', color:'var(--muted)',
                  padding:'3px 10px', borderRadius:'20px'
                }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
