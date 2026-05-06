import { getAllArticles, getAllCategories } from '../lib/data'
import HomeClient from './HomeClient'

export default function Home() {
  const articles   = getAllArticles()
  const categories = getAllCategories()
  return <HomeClient articles={articles} categories={categories}/>
}
