#!/usr/bin/env node
// scripts/discover-family.mjs
// ─────────────────────────────────────────────────────────────────────
// Auto-discovers the full chirag127/* family inventory via the GitHub
// API, classifies each repo by slug suffix, and regenerates the
// adjacent `src/family-data.ts` registry.
//
// CLASSIFICATION RULES
//   *-app                     → FAMILY_APPS
//   *-npm-pkg                 → FAMILY_PACKAGES
//   *-api                     → FAMILY_APIS
//   *-book                    → FAMILY_BOOKS
//   *-ext / *-vsc-ext / *-mcp → FAMILY_EXTENSIONS
//   *-skill                   → FAMILY_SKILLS
//   anything else             → ignored
//
// USAGE
//   node scripts/discover-family.mjs            # regenerate, print diff
//   node scripts/discover-family.mjs --check    # exit 1 if diff exists
//   node scripts/discover-family.mjs --dry      # print only, do not write
//
// EXIT CODES
//   0 — no diff (or diff written successfully without --check)
//   1 — diff exists (under --check)  OR error
//
// DEPENDENCIES
//   - `gh` CLI authenticated as a user with read access to chirag127/*
//   - Node 22+ (uses node:fs/promises, top-level await)
// ─────────────────────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TARGET = resolve(__dirname, '..', 'src', 'family-data.ts')

const args = new Set(process.argv.slice(2))
const CHECK = args.has('--check')
const DRY = args.has('--dry')

/** Shell out to `gh` with JSON output. */
function gh(...rest) {
  return execFileSync('gh', rest, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
}

/** Enumerate every chirag127/* repo, paginated. */
function listRepos() {
  const raw = gh(
    'api',
    '--paginate',
    '-H', 'Accept: application/vnd.github+json',
    'users/chirag127/repos?per_page=100&type=public',
  )
  // gh --paginate concatenates JSON arrays — parse each non-empty line/block.
  // The safe approach: split on `][` then rejoin as a single array.
  const joined = '[' + raw.replace(/\]\s*\[/g, ',').replace(/^\s*\[/, '').replace(/\]\s*$/, '') + ']'
  return JSON.parse(joined)
}

/** Classify a repo by its slug suffix. Returns null if not part of the family. */
function classify(slug) {
  if (/-vsc-ext$|-mcp$|-ext$/.test(slug)) return 'extension'
  if (/-npm-pkg$/.test(slug)) return 'package'
  if (/-app$/.test(slug)) return 'app'
  if (/-api$/.test(slug)) return 'api'
  if (/-book$/.test(slug)) return 'book'
  if (/-skill$/.test(slug)) return 'skill'
  return null
}

/** App category from slug heuristics — refined by master repo path during sync. */
function appCategory(slug) {
  if (slug === 'home-app') return 'hub'
  if (/-me-app$/.test(slug)) return 'personal'
  if (/-tools-app$/.test(slug)) return 'tools'
  return 'content'
}

function packageCategory(slug) {
  if (slug.startsWith('astro-')) return 'astro'
  if (slug.startsWith('auth-')) return 'auth'
  if (slug.startsWith('omni-')) return 'omni'
  return 'oriz'
}

function extSurface(slug) {
  if (/-vsc-ext$/.test(slug)) return 'vscode'
  if (/-mcp$/.test(slug)) return 'mcp'
  return 'chrome'
}

function shortSlug(slug, suffix) {
  return slug.replace(new RegExp(`${suffix}$`), '')
}

/** Build the typed registry data structure. */
function build(repos) {
  const apps = []
  const packages = []
  const apis = []
  const books = []
  const extensions = []
  const skills = []

  for (const r of repos) {
    if (r.archived) continue
    const kind = classify(r.name)
    if (!kind) continue

    const tagline = r.description ? r.description.trim() : ''
    const url = r.homepage && r.homepage.trim() ? r.homepage.trim() : r.html_url

    if (kind === 'app') {
      apps.push({
        slug: r.name,
        name: r.name.replace(/^oriz-/, 'oriz / ').replace(/-app$/, '').replace(/-/g, ' '),
        url,
        category: appCategory(r.name),
        status: 'live',
        tagline,
      })
    } else if (kind === 'package') {
      const short = shortSlug(r.name, '-npm-pkg')
      packages.push({
        slug: short,
        npm: `@chirag127/${short}`,
        ghRepo: `chirag127/${r.name}`,
        category: packageCategory(short),
        tagline,
      })
    } else if (kind === 'api') {
      apis.push({
        slug: r.name,
        url,
        category: 'utility',
        status: 'live',
        tagline,
      })
    } else if (kind === 'book') {
      books.push({
        slug: r.name,
        title: r.name.replace(/-book$/, '').replace(/-/g, ' '),
        channels: ['github'],
        status: 'planned',
        tagline,
      })
    } else if (kind === 'extension') {
      extensions.push({
        slug: r.name,
        surface: extSurface(r.name),
        url,
        tagline,
      })
    } else if (kind === 'skill') {
      skills.push({
        slug: r.name,
        install: `npx skills add chirag127/${r.name} -g -a claude-code`,
        description: tagline || `Skill: ${r.name}`,
      })
    }
  }

  // Stable sort by slug for reproducible diffs.
  const cmp = (a, b) => a.slug.localeCompare(b.slug)
  apps.sort(cmp)
  packages.sort(cmp)
  apis.sort(cmp)
  books.sort(cmp)
  extensions.sort(cmp)
  skills.sort(cmp)

  return { apps, packages, apis, books, extensions, skills }
}

/** Stringify with deterministic key order — matches the hand-written shape. */
function serialize(data) {
  const fields = (obj, keys) => {
    const out = []
    for (const k of keys) {
      if (obj[k] === undefined || obj[k] === '') continue
      out.push(`    ${k}: ${JSON.stringify(obj[k])},`)
    }
    return out.join('\n')
  }
  const block = (items, keys) =>
    items.map((it) => `  {\n${fields(it, keys)}\n  },`).join('\n')

  const appsBlk = block(data.apps, ['slug', 'name', 'url', 'category', 'status', 'tagline'])
  const pkgsBlk = block(data.packages, ['slug', 'npm', 'ghRepo', 'category', 'version', 'tagline'])
  const apisBlk = block(data.apis, ['slug', 'url', 'rapidApiUrl', 'schemaUrl', 'category', 'status', 'tagline'])
  const booksBlk = data.books.map((b) =>
    `  {\n    slug: ${JSON.stringify(b.slug)},\n    title: ${JSON.stringify(b.title)},\n    channels: ${JSON.stringify(b.channels)},\n    status: ${JSON.stringify(b.status)},${b.tagline ? `\n    tagline: ${JSON.stringify(b.tagline)},` : ''}\n  },`
  ).join('\n')
  const extsBlk = block(data.extensions, ['slug', 'surface', 'url', 'tagline'])
  const skillsBlk = data.skills.map((s) =>
    `  {\n    slug: ${JSON.stringify(s.slug)},\n    install: ${JSON.stringify(s.install)},\n    description: ${JSON.stringify(s.description)},\n  },`
  ).join('\n')

  // We rewrite only the array bodies; everything else (types + helpers) stays.
  return { appsBlk, pkgsBlk, apisBlk, booksBlk, extsBlk, skillsBlk }
}

/** Replace each FAMILY_* array body inside the existing file. */
function rewrite(source, blocks) {
  const swap = (text, name, body) => {
    const re = new RegExp(
      `(export const ${name}[^=]*=\\s*\\[)([\\s\\S]*?)(\\n\\])`,
      'm',
    )
    return text.replace(re, (_m, open, _old, close) => `${open}\n${body}${close}`)
  }
  let out = source
  out = swap(out, 'FAMILY_APPS', blocks.appsBlk)
  out = swap(out, 'FAMILY_PACKAGES', blocks.pkgsBlk)
  out = swap(out, 'FAMILY_APIS', blocks.apisBlk)
  out = swap(out, 'FAMILY_BOOKS', blocks.booksBlk)
  out = swap(out, 'FAMILY_EXTENSIONS', blocks.extsBlk)
  out = swap(out, 'FAMILY_SKILLS', blocks.skillsBlk)
  return out
}

function summarize(prev, next, data) {
  const prevCount = (name) => (prev.match(new RegExp(`slug: "`, 'g')) || []).length
  const counts = {
    apps: data.apps.length,
    packages: data.packages.length,
    apis: data.apis.length,
    books: data.books.length,
    extensions: data.extensions.length,
    skills: data.skills.length,
  }
  const changed = prev !== next
  return { changed, counts, prevCount }
}

async function main() {
  const repos = listRepos()
  console.log(`[discover-family] fetched ${repos.length} chirag127 repos`)

  const data = build(repos)
  const blocks = serialize(data)

  const prev = await readFile(TARGET, 'utf8')
  const next = rewrite(prev, blocks)

  const { changed, counts } = summarize(prev, next, data)

  console.log('[discover-family] entity counts:', JSON.stringify(counts))

  if (!changed) {
    console.log('[discover-family] no diff vs current family-data.ts')
    process.exit(0)
  }

  console.log('[discover-family] DIFF detected')
  if (DRY) {
    console.log('[discover-family] --dry: not writing')
    process.exit(CHECK ? 1 : 0)
  }

  await writeFile(TARGET, next, 'utf8')
  console.log(`[discover-family] wrote ${TARGET}`)
  process.exit(CHECK ? 1 : 0)
}

main().catch((err) => {
  console.error('[discover-family] FATAL', err)
  process.exit(1)
})
