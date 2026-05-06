import { getAllArticles, getAllCategories, getSettings } from '../lib/data'
import HomeClient from './HomeClient'

export default function Home() {
  const articles   = getAllArticles()
  const categories = getAllCategories()
  const settings   = getSettings()
  return <HomeClient articles={articles} categories={categories} settings={settings}/>
}
