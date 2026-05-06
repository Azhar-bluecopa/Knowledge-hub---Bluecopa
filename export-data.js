/**
 * KnowledgeHub — Data Export Script
 * Run: node export-data.js
 * Creates a timestamped backup of all your data
 */

const fs   = require('fs');
const path = require('path');

const db       = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));
const stamp    = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const fileName = `backup-${stamp}.json`;

const backup = {
  exported_at : new Date().toISOString(),
  articles    : db.articles.length,
  categories  : db.categories.length,
  data        : db
};

fs.writeFileSync(path.join(__dirname, fileName), JSON.stringify(backup, null, 2), 'utf8');

console.log('✅ Export complete!');
console.log(`   File : ${fileName}`);
console.log(`   Articles  : ${db.articles.length}`);
console.log(`   Categories: ${db.categories.length}`);
console.log('\n   Use this file to import your data on any new platform.');
