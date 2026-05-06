'use client'

// Renders markdown-like article content into React elements
// Supports: headings, lists, blockquotes, tables, callouts, [html] blocks

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

function inlineFmt(raw) {
  return escHtml(raw)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

export default function ContentRenderer({ content }) {
  if (!content) return null

  const lines = content.split('\n')
  const elements = []
  let i = 0
  let tableHeader = null
  let tableRows = []
  let listItems = []
  let listType = null
  let key = 0

  const nextKey = () => key++

  const flushTable = () => {
    if (!tableHeader) return
    elements.push(
      <div className="rc-table-wrap" key={nextKey()}>
        <table className="rc-table">
          <thead>
            <tr>{tableHeader.map((h,ci) => <th key={ci} dangerouslySetInnerHTML={{__html: inlineFmt(h.trim())}}/>)}</tr>
          </thead>
          <tbody>
            {tableRows.map((row,ri) => (
              <tr key={ri}>{row.map((c,ci) => <td key={ci} dangerouslySetInnerHTML={{__html: inlineFmt(c.trim())}}/>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableHeader = null
    tableRows = []
  }

  const flushList = () => {
    if (!listItems.length) return
    const Tag = listType === 'ol' ? 'ol' : 'ul'
    elements.push(
      <Tag key={nextKey()}>
        {listItems.map((item,li) => (
          <li key={li} dangerouslySetInnerHTML={{__html: inlineFmt(item)}}/>
        ))}
      </Tag>
    )
    listItems = []
    listType = null
  }

  while (i < lines.length) {
    const line = lines[i]

    // Raw HTML block
    if (line.trim() === '[html]') {
      flushTable(); flushList()
      let html = ''
      i++
      while (i < lines.length && lines[i].trim() !== '[/html]') {
        html += lines[i] + '\n'
        i++
      }
      elements.push(<div key={nextKey()} dangerouslySetInnerHTML={{__html: html}}/>)
      i++; continue
    }

    // Table row
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.trim().slice(1,-1).split('|')
      if (cells.every(c => /^[\s:|-]+$/.test(c))) { i++; continue } // separator
      flushList()
      if (!tableHeader) { tableHeader = cells }
      else { tableRows.push(cells) }
      i++; continue
    } else { flushTable() }

    // HR
    if (/^---+$/.test(line.trim())) {
      flushList()
      elements.push(<hr key={nextKey()}/>)
      i++; continue
    }

    // Code block
    if (line.startsWith('```')) {
      flushList(); flushTable()
      let code = ''
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        code += lines[i] + '\n'
        i++
      }
      elements.push(<pre key={nextKey()}>{code.trimEnd()}</pre>)
      i++; continue
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList(); flushTable()
      elements.push(<h3 key={nextKey()} dangerouslySetInnerHTML={{__html: inlineFmt(line.slice(4))}}/>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      flushList(); flushTable()
      elements.push(<h2 key={nextKey()} dangerouslySetInnerHTML={{__html: inlineFmt(line.slice(3))}}/>)
      i++; continue
    }
    if (line.startsWith('# ')) {
      flushList(); flushTable()
      elements.push(<h1 key={nextKey()} dangerouslySetInnerHTML={{__html: inlineFmt(line.slice(2))}}/>)
      i++; continue
    }

    // Callouts
    if (line.startsWith('>! '))  { flushList(); elements.push(<div key={nextKey()} className="callout callout-warning"  dangerouslySetInnerHTML={{__html: inlineFmt(line.slice(3))}}/>); i++; continue }
    if (line.startsWith('>* '))  { flushList(); elements.push(<div key={nextKey()} className="callout callout-tip"      dangerouslySetInnerHTML={{__html: inlineFmt(line.slice(3))}}/>); i++; continue }
    if (line.startsWith('>@ '))  { flushList(); elements.push(<div key={nextKey()} className="callout callout-critical" dangerouslySetInnerHTML={{__html: inlineFmt(line.slice(3))}}/>); i++; continue }
    if (line.startsWith('>i '))  { flushList(); elements.push(<div key={nextKey()} className="callout callout-info"     dangerouslySetInnerHTML={{__html: inlineFmt(line.slice(3))}}/>); i++; continue }
    if (line.startsWith('>+ '))  { flushList(); elements.push(<div key={nextKey()} className="callout callout-success"  dangerouslySetInnerHTML={{__html: inlineFmt(line.slice(3))}}/>); i++; continue }

    // Standard blockquote
    if (line.startsWith('> ')) {
      flushList()
      elements.push(<blockquote key={nextKey()} dangerouslySetInnerHTML={{__html: inlineFmt(line.slice(2))}}/>)
      i++; continue
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      if (listType === 'ol') flushList()
      listType = 'ul'
      listItems.push(line.slice(2))
      i++; continue
    }

    // Ordered list
    const olM = line.match(/^(\d+)\. (.+)/)
    if (olM) {
      if (listType === 'ul') flushList()
      listType = 'ol'
      listItems.push(olM[2])
      i++; continue
    }

    // Blank line
    if (line.trim() === '') {
      flushList(); flushTable()
      elements.push(<div key={nextKey()} className="para-gap"/>)
      i++; continue
    }

    // Paragraph
    flushList(); flushTable()
    elements.push(<p key={nextKey()} dangerouslySetInnerHTML={{__html: inlineFmt(line)}}/>)
    i++
  }

  flushList(); flushTable()

  return <div className="article-body">{elements}</div>
}
