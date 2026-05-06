import path from 'path'
import fs   from 'fs'

function getDB() {
  const file = path.join(process.cwd(), 'data.json')
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function getAllArticles()   { return getDB().articles   || [] }
export function getAllCategories() { return getDB().categories || [] }
export function getSettings()     { return getDB().settings   || {} }
export function getArticleById(id) {
  return getAllArticles().find(a => String(a.id) === String(id)) || null
}
