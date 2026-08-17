#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => {
  if (item.startsWith('--')) pairs.push([item.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.data || !args.out) {
  console.error('Usage: render-dashboard.mjs --data <dashboard-data.json> --out <dashboard-dir>')
  process.exit(2)
}

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const templateRoot = path.resolve(skillRoot, 'assets/dashboard-template')
const dataPath = path.resolve(args.data)
const outputRoot = path.resolve(args.out)
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
for (const key of ['title', 'creator', 'overview', 'posts', 'deepDives', 'boundaries']) {
  if (data[key] === undefined) throw new Error(`dashboard-data missing ${key}`)
}

fs.mkdirSync(outputRoot, { recursive: true })
for (const file of ['index.html', 'styles.css', 'app.js']) {
  fs.copyFileSync(path.resolve(templateRoot, file), path.resolve(outputRoot, file))
}
fs.writeFileSync(path.resolve(outputRoot, 'dashboard-data.json'), `${JSON.stringify(data, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, output: outputRoot, posts: data.posts.length, deepDives: data.deepDives.length }))
