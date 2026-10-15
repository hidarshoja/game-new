import { createWriteStream, copyFileSync } from 'node:fs'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { ANIMALS } from '../src/data/animals.js'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'public', 'sounds')
const UA = 'KidsGamesEducational/1.0 (local animal-sound quiz for children)'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Verified Wikimedia Commons audio filenames */
const FILES = {
  goose: 'Branta canadensis - Canada Goose - XC62259.ogg',
  eagle: 'Yellowstone sound library - Bald Eagle - 001.mp3',
  crocodile: 'Alligatorbellowedit.ogg',
  puma: 'Cougar1.ogg',
  cheetah: 'Acoustic-Structure-and-Contextual-Use-of-Calls-by-Captive-Male-and-Female-Cheetahs-(Acinonyx-pone.0158546.s001.oga',
  otter: 'Smooth-coated otter sound.wav',
  crow: 'Corvus corone - Carrion Crow XC533768.mp3',
  rabbit: 'Rabbit oinks and squeaks.wav',
  bird: 'Bourne woods Birdsong and rain 2020-06-17 0748.mp3',
  stork: 'White Stork (Ciconia ciconia) (W1CDR0001452 BD10).ogg',
  seagull: 'Herring Gull (Larus argentatus) (W1CDR0001455 BD14).ogg',
  snake: 'Snake.ogg',
  lion: 'Lion.ogg',
  tiger: '439280 schots angry-tiger.wav',
  mouse: 'Maus.ogg',
  gorilla: 'Gorillas.ogg',
  seal: 'Harbor seal underwater.ogg',
  camel: 'Camel.ogg',
  zebra: 'Equus zebra.ogg',
  panda: 'Giant Panda.ogg',
  koala: 'Koala.ogg',
  shrimp: 'Alpheus.ogg',
  fish: 'Underwater ambience.ogg',
  goldfish: 'Aquarium.ogg',
  shark: 'Shark.ogg',
  ladybug: 'Insect buzz.ogg',
  spider: 'Insect.ogg',
  llama: 'Llama.ogg',
  buffalo: 'Buffalo.ogg',
  hare: 'Hare.ogg',
  ostrich: 'Ostrich.ogg',
  walrus: 'Walrus.ogg',
  stingray: 'Ray.ogg',
  locust: 'Locust.ogg',
  silkworm: 'Silkworm.ogg',
  falcon: 'Falcon.ogg',
  leopard: 'Leopard.ogg',
  jackal: 'Jackal.ogg',
  skunk: 'Skunk.ogg',
  orangutan: 'Orangutan.ogg',
  chipmunk: 'Chipmunk.ogg',
  chickadee: 'Poecile atricapillus - Black-capped Chickadee XC139375.mp3',
  hummingbird: 'Hummingbird.ogg',
}

/** Closest real recording already on disk */
const ALIAS = {
  kitten: 'cat',
  chick: 'chicken',
  ox: 'cow',
  bull: 'cow',
  buffalo: 'cow',
  ram: 'sheep',
  calf: 'cow',
  lamb: 'sheep',
  owlet: 'owl',
  honeybee: 'bee',
  polar: 'bear',
  arcticfox: 'fox',
  bactrian: 'camel',
  puppy: 'dog',
}

function strip(value) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)
}

function transcodeMp3(originalUrl) {
  const url = new URL(originalUrl.split('?')[0])
  if (url.pathname.toLowerCase().endsWith('.mp3')) return url.href
  const parts = url.pathname.split('/')
  const file = parts.pop()
  const base = parts.join('/').replace('/wikipedia/commons/', '/wikipedia/commons/transcoded/')
  return `${url.origin}${base}/${file}/${file}.mp3`
}

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function download(url, dest) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!response.ok || !response.body) throw new Error(`download ${response.status}`)
      await pipeline(response.body, createWriteStream(dest))
      return true
    } catch (error) {
      await sleep(String(error.message).includes('429') ? 9000 * (attempt + 1) : 1800)
    }
  }
  return false
}

async function lookup(names) {
  const map = new Map()
  const unique = [...new Set(names.filter(Boolean))]
  for (let i = 0; i < unique.length; i += 20) {
    const chunk = unique.slice(i, i + 20)
    const url = new URL('https://commons.wikimedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('format', 'json')
    url.searchParams.set('titles', chunk.map((name) => `File:${name}`).join('|'))
    url.searchParams.set('prop', 'imageinfo')
    url.searchParams.set('iiprop', 'url|size|mime|extmetadata')
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const response = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
        const text = await response.text()
        if (text.startsWith('You are')) throw new Error('429')
        const data = JSON.parse(text)
        for (const page of Object.values(data.query?.pages || {})) {
          if (page.missing || !page.imageinfo?.[0]) continue
          const info = page.imageinfo[0]
          const meta = info.extmetadata || {}
          map.set(page.title.replace(/^File:/, ''), {
            title: page.title.replace(/^File:/, ''),
            url: info.url.split('?')[0],
            author: strip(meta.Artist?.value || ''),
            license: strip(meta.LicenseShortName?.value || ''),
          })
        }
        break
      } catch {
        await sleep(8000 * (attempt + 1))
      }
    }
    await sleep(1200)
  }
  return map
}

async function search(query) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const url = new URL('https://commons.wikimedia.org/w/api.php')
      url.searchParams.set('action', 'query')
      url.searchParams.set('format', 'json')
      url.searchParams.set('generator', 'search')
      url.searchParams.set('gsrnamespace', '6')
      url.searchParams.set('gsrlimit', '8')
      url.searchParams.set('gsrsearch', `${query} filetype:audio`)
      url.searchParams.set('prop', 'imageinfo')
      url.searchParams.set('iiprop', 'url|size|mime|extmetadata')
      const response = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
      const text = await response.text()
      if (text.startsWith('You are')) throw new Error('429')
      const data = JSON.parse(text)
      return Object.values(data.query?.pages || {})
        .map((page) => {
          const info = page.imageinfo?.[0]
          if (!info?.url) return null
          const meta = info.extmetadata || {}
          const title = page.title.replace(/^File:/, '')
          if (/en-us|en-au|de-|fr-|nl-|ll-q|article|pronounc|wiktionary|music|piano|ragtime|song by/i.test(title)) return null
          return {
            title,
            url: info.url.split('?')[0],
            size: info.size || 0,
            author: strip(meta.Artist?.value || ''),
            license: strip(meta.LicenseShortName?.value || ''),
          }
        })
        .filter(Boolean)
    } catch {
      await sleep(9000 * (attempt + 1))
    }
  }
  return []
}

await mkdir(OUT, { recursive: true })
const creditsPath = path.join(OUT, 'credits.json')
let credits = await exists(creditsPath) ? JSON.parse(await readFile(creditsPath, 'utf8')) : []
const used = new Set(credits.map((item) => item.source))

const missing = []
for (const animal of ANIMALS) {
  if (!(await exists(path.join(OUT, `${animal.id}.mp3`)))) missing.push(animal)
}

const known = await lookup(Object.values(FILES))

for (const animal of missing) {
  const dest = path.join(OUT, `${animal.id}.mp3`)
  const alias = ALIAS[animal.id]
  if (alias && (await exists(path.join(OUT, `${alias}.mp3`)))) {
    copyFileSync(path.join(OUT, `${alias}.mp3`), dest)
    credits.push({
      id: animal.id,
      name: animal.name,
      file: `${animal.id}.mp3`,
      title: `alias:${alias}`,
      author: '',
      license: 'same as source recording',
      source: `alias:${alias}`,
    })
    await writeFile(creditsPath, JSON.stringify(credits, null, 2))
    console.log('alias', animal.id, '→', alias)
    continue
  }

  let pick = known.get(FILES[animal.id] || '')
  if (!pick || used.has(pick.url)) {
    const pages = await search(animal.id)
    pick = pages.find((item) => !used.has(item.url) && item.size > 3000 && item.size < 16000000)
  }
  if (!pick) {
    console.log('miss', animal.id)
    await sleep(900)
    continue
  }
  const saved = await download(transcodeMp3(pick.url), dest)
  if (!saved) {
    console.log('fail', animal.id, pick.title)
    continue
  }
  used.add(pick.url)
  credits.push({
    id: animal.id,
    name: animal.name,
    file: `${animal.id}.mp3`,
    title: pick.title,
    author: pick.author,
    license: pick.license,
    source: pick.url,
  })
  await writeFile(creditsPath, JSON.stringify(credits, null, 2))
  console.log('ok', animal.id, pick.title)
  await sleep(1600)
}

let have = 0
for (const animal of ANIMALS) {
  if (await exists(path.join(OUT, `${animal.id}.mp3`))) have += 1
}
console.log('done', have, '/', ANIMALS.length)
