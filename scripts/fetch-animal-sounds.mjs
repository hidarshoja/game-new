import { createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile, access, unlink } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { ANIMALS } from '../src/data/animals.js'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'public', 'sounds')
const UA = 'KidsGamesEducational/1.0 (local animal-sound quiz for children)'

const SPEC = {
  cat: ['domestic cat meow', ['meow', 'cat']],
  dog: ['dog barking', ['dog', 'bark'], ['why', 'yourself', 'keep', 'human', 'licking']],
  rabbit: ['rabbit squeak', ['rabbit']],
  bird: ['small bird chirping', ['bird'], ['pone', 'ganglia', 'nucleus']],
  fox: ['fox bark', ['fox'], ['sparrow', 'passerella', 'bird']],
  bear: ['bear growl', ['bear', 'growl']],
  lion: ['lion roar', ['lion', 'roar']],
  tiger: ['tiger roar', ['tiger']],
  wolf: ['wolf howl', ['wolf', 'howl'], ['man', 'human']],
  elephant: ['elephant trumpet', ['elephant']],
  giraffe: ['giraffe hum', ['giraffe'], ['en-us', 'en-au']],
  zebra: ['zebra call', ['zebra'], ['dove']],
  horse: ['horse neigh', ['horse', 'neigh']],
  cow: ['cow moo', ['cow', 'moo']],
  pig: ['pig oink', ['pig', 'oink']],
  sheep: ['sheep bleat', ['sheep', 'bleat']],
  goat: ['goat bleat', ['goat']],
  chicken: ['chicken cluck', ['chicken', 'hen', 'cluck']],
  rooster: ['rooster crowing', ['rooster', 'cock']],
  chick: ['chick peeping', ['chick', 'peep']],
  duck: ['duck quack', ['duck', 'quack']],
  goose: ['goose honk', ['goose']],
  frog: ['frog croak', ['frog', 'croak']],
  monkey: ['monkey call', ['monkey']],
  gorilla: ['gorilla vocalization', ['gorilla']],
  panda: ['giant panda bleat', ['panda']],
  koala: ['koala bellow', ['koala']],
  kangaroo: ['kangaroo', ['kangaroo']],
  bat: ['bat echolocation', ['bat']],
  owl: ['owl hoot', ['owl', 'hoot']],
  eagle: ['eagle call', ['eagle']],
  parrot: ['parrot talking', ['parrot']],
  penguin: ['penguin call', ['penguin']],
  swan: ['swan call', ['swan']],
  peacock: ['peacock call', ['peacock']],
  flamingo: ['flamingo call', ['flamingo']],
  dove: ['dove cooing', ['dove', 'pigeon']],
  crow: ['crow caw', ['crow', 'caw']],
  sparrow: ['sparrow song', ['sparrow']],
  nightingale: ['nightingale song', ['nightingale']],
  fish: ['fish underwater', ['fish']],
  goldfish: ['goldfish', ['goldfish', 'fish']],
  shark: ['shark', ['shark']],
  whale: ['whale song', ['whale']],
  dolphin: ['dolphin whistle', ['dolphin']],
  octopus: ['octopus', ['octopus']],
  crab: ['crab', ['crab']],
  shrimp: ['snapping shrimp', ['shrimp']],
  turtle: ['turtle', ['turtle']],
  snake: ['snake hiss', ['snake', 'hiss']],
  lizard: ['lizard', ['lizard', 'gecko']],
  crocodile: ['crocodile bellow', ['crocodile', 'alligator']],
  snail: ['snail', ['snail']],
  butterfly: ['butterfly', ['butterfly']],
  bee: ['bee buzzing', ['bee', 'buzz']],
  ladybug: ['ladybug', ['ladybug', 'beetle']],
  ant: ['ants', ['ant']],
  spider: ['spider', ['spider']],
  cricket: ['cricket chirp', ['cricket', 'chirp']],
  fly: ['fly buzzing', ['fly', 'buzz']],
  mosquito: ['mosquito buzz', ['mosquito']],
  worm: ['earthworm', ['worm']],
  camel: ['camel grunt', ['camel']],
  llama: ['llama hum', ['llama']],
  rhino: ['rhinoceros', ['rhino', 'rhinoceros']],
  hippo: ['hippopotamus', ['hippo', 'hippopotamus']],
  buffalo: ['buffalo bellow', ['buffalo']],
  deer: ['deer call', ['deer']],
  moose: ['moose call', ['moose']],
  hedgehog: ['hedgehog sniffing', ['hedgehog']],
  raccoon: ['raccoon', ['raccoon']],
  badger: ['badger', ['badger']],
  otter: ['otter', ['otter']],
  squirrel: ['squirrel chirp', ['squirrel']],
  hamster: ['hamster', ['hamster']],
  mouse: ['mouse squeak', ['mouse']],
  hare: ['hare', ['hare']],
  ostrich: ['ostrich boom', ['ostrich']],
  turkey: ['turkey gobble', ['turkey', 'gobble']],
  vulture: ['vulture', ['vulture']],
  pelican: ['pelican', ['pelican']],
  seal: ['seal bark', ['seal']],
  walrus: ['walrus', ['walrus']],
  orca: ['orca call', ['orca', 'killer whale']],
  tropical: ['pufferfish', ['puffer', 'fish']],
  stingray: ['stingray', ['ray', 'fish']],
  jellyfish: ['jellyfish', ['jellyfish']],
  hermit: ['hermit crab', ['crab']],
  scorpion: ['scorpion', ['scorpion']],
  centipede: ['centipede', ['centipede']],
  firefly: ['firefly', ['firefly']],
  dragonfly: ['dragonfly', ['dragonfly']],
  locust: ['locust stridulation', ['locust', 'grasshopper']],
  silkworm: ['silkworm', ['silkworm', 'moth']],
  honeybee: ['honey bee buzzing', ['bee', 'buzz']],
  bactrian: ['bactrian camel', ['camel']],
  ox: ['ox lowing', ['ox', 'cattle', 'cow']],
  calf: ['calf mooing', ['calf', 'cow']],
  lamb: ['lamb bleating', ['lamb', 'sheep']],
  puppy: ['puppy barking', ['puppy', 'bark', 'dog']],
  kitten: ['kitten meow', ['kitten', 'meow', 'cat']],
  owlet: ['young owl', ['owl']],
  falcon: ['falcon call', ['falcon']],
  canary: ['canary song', ['canary']],
  lovebird: ['lovebird', ['lovebird', 'parrot']],
  polar: ['polar bear', ['bear']],
  leopard: ['leopard roar', ['leopard']],
  cheetah: ['cheetah chirp', ['cheetah']],
  hyena: ['hyena laugh', ['hyena']],
  jackal: ['jackal howl', ['jackal']],
  arcticfox: ['arctic fox', ['fox']],
  puma: ['cougar scream', ['cougar', 'puma', 'mountain lion']],
  skunk: ['skunk', ['skunk']],
  sloth: ['sloth', ['sloth']],
  orangutan: ['orangutan call', ['orangutan']],
  chipmunk: ['chipmunk chirp', ['chipmunk']],
  beaver: ['beaver', ['beaver']],
  boar: ['wild boar grunt', ['boar']],
  donkey: ['donkey bray', ['donkey', 'bray']],
  bull: ['bull bellow', ['bull']],
  ram: ['ram bleat', ['ram', 'sheep']],
  chickadee: ['chickadee song', ['chickadee']],
  woodpecker: ['woodpecker drumming', ['woodpecker']],
  hummingbird: ['hummingbird', ['hummingbird']],
  seagull: ['seagull call', ['gull', 'seagull']],
  stork: ['stork clatter', ['stork']],
}

const BAN = ['music', 'piano', 'guitar', 'orchestra', 'speech', 'interview', 'homo', 'traffic', 'airplane', 'aircraft', 'motorcycle', 'news', 'podcast', 'ringtone', 'cartoon', 'synthes', 'wiktionary', 'pronunciation', 'spoken', 'yourself', 'why keep', 'pone.', 'ncomms', 'srep']

function transcodeMp3(originalUrl) {
  const url = new URL(originalUrl.split('?')[0])
  if (url.pathname.toLowerCase().endsWith('.mp3')) return url.href
  const parts = url.pathname.split('/')
  const file = parts.pop()
  const base = parts.join('/').replace('/wikipedia/commons/', '/wikipedia/commons/transcoded/')
  return `${url.origin}${base}/${file}/${file}.mp3`
}

async function search(query) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrnamespace', '6')
  url.searchParams.set('gsrlimit', '12')
  url.searchParams.set('gsrsearch', `${query} filetype:audio`)
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|size|mime|extmetadata')
  const response = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
  if (!response.ok) throw new Error(`search ${response.status}`)
  const data = await response.json()
  return Object.values(data.query?.pages || {})
    .map((page) => {
      const info = page.imageinfo?.[0]
      if (!info?.url) return null
      const meta = info.extmetadata || {}
      return {
        title: page.title.replace(/^File:/, ''),
        url: info.url.split('?')[0],
        size: info.size || 0,
        mime: info.mime || '',
        author: strip(meta.Artist?.value || ''),
        license: strip(meta.LicenseShortName?.value || ''),
      }
    })
    .filter(Boolean)
}

function strip(value) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)
}

const SPOKEN = /^(en|de|nl|fr|es|it|pt|ru|ja|zh|ar|fa|pl|sv|cs|fi|hu|ko|el|tr|uk|ro|bg|hr|sk|sl|da|no|ca|eu)[-_. ]/

function score(item, must, forbid = []) {
  const title = item.title.toLowerCase()
  if (SPOKEN.test(title)) return -1
  if (BAN.some((word) => title.includes(word))) return -1
  if (forbid.some((word) => title.includes(word.toLowerCase()))) return -1
  if (item.size < 4000 || item.size > 2200000) return -1
  if (!/^audio\/|application\/ogg|application\/opus/.test(item.mime) && !/\.(ogg|oga|mp3|wav|opus|flac)$/i.test(item.title)) return -1
  const hits = must.filter((word) => title.includes(word.toLowerCase()))
  if (hits.length !== must.length) return -1
  let value = 80 + hits.length * 10
  if (item.size < 280000) value += 25
  else if (item.size > 1200000) value -= 15
  if (title.split(/\s+/).length > 8) value -= 20
  return value
}

async function download(url, dest) {
  const response = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!response.ok || !response.body) throw new Error(`download ${response.status}`)
  const type = response.headers.get('content-type') || ''
  if (!type.includes('audio') && !type.includes('mpeg') && !type.includes('ogg')) {
    throw new Error(`not audio ${type}`)
  }
  await pipeline(response.body, createWriteStream(dest))
}

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

const DIRECT = {
  dog: 'Bark Huayra.ogg',
  puppy: 'Perro ladrando.ogg',
  bear: 'Bear growl.ogg',
  elephant: 'Elephant voice - trumpeting.ogg',
  pig: 'Mudchute pig 3.ogg',
  sheep: 'Sheep bleating.ogg',
  goat: 'Herd of goats bleating.ogg',
  bee: 'Bee buzzing sound (animal noises).opus',
  honeybee: 'Bee Buzzing Sound - Animal Sounds.opus',
  donkey: '157763 felix-blume a-donkey-is-braying-in-his-enclosure-in-south-of-france.wav',
  dolphin: '161691 felixblume dolphin-screaming-underwater-in-caribbean-sea-mexico.wav',
  horse: 'Segregation-of-information-about-emotional-arousal-and-valence-in-horse-whinnies-srep09989-s3.oga',
  boar: 'Boar.Grwls(1).ogg',
  whale: 'Long finned Pilot Whales orig.ogg',
  moose: 'Moose mate.ogg',
  squirrel: 'A three-striped palm squirrel (Funambulus palmarum) chirping 16January2015.oga',
  frog: 'Frogs croak calling chorus at night.ogg',
  monkey: 'Sound-of-stump-tailed-macaque-(macaca-arctoides).ogg',
  hedgehog: 'Hedgehog O.ogg',
  deer: 'Male roe deer growl.ogg',
  cricket: 'Atmo – Grillen mit Vögel.mp3',
  bat: 'Petit rhinolophe.ogg',
  lizard: 'Gekko gecko.wav',
  mouse: 'Phase-Specific-Vocalizations-of-Male-Mice-at-the-Initial-Encounter-during-the-Courtship-Sequence-pone.0147102.s002.ogv',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function searchRetry(query) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await search(query)
    } catch (error) {
      const wait = String(error.message).includes('429') ? 5000 * (attempt + 1) : 1500
      console.log('retry-search', attempt, error.message)
      await sleep(wait)
    }
  }
  return []
}

async function downloadRetry(url, dest) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await download(url, dest)
      return true
    } catch (error) {
      const wait = String(error.message).includes('429') ? 5000 * (attempt + 1) : 1200
      console.log('retry-dl', attempt, error.message)
      await sleep(wait)
    }
  }
  return false
}

await mkdir(OUT, { recursive: true })
for (const id of ['dog', 'fox', 'giraffe', 'hedgehog']) {
  await unlink(path.join(OUT, `${id}.mp3`)).catch(() => {})
}
const creditsPath = path.join(OUT, 'credits.json')
let credits = []
if (await exists(creditsPath)) {
  credits = JSON.parse(await readFile(creditsPath, 'utf8'))
}
credits = credits.filter((item) => !['dog', 'fox', 'giraffe', 'hedgehog'].includes(item.id))
await writeFile(creditsPath, JSON.stringify(credits, null, 2))
const used = new Set(credits.map((item) => item.source))

async function lookupFiles(names) {
  const map = new Map()
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('titles', names.map((name) => `File:${name}`).join('|'))
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|size|mime|extmetadata')
  const response = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
  const data = await response.json()
  for (const page of Object.values(data.query?.pages || {})) {
    if (page.missing || !page.imageinfo?.[0]) continue
    const info = page.imageinfo[0]
    const meta = info.extmetadata || {}
    map.set(page.title.replace(/^File:/, ''), {
      title: page.title.replace(/^File:/, ''),
      url: info.url.split('?')[0],
      size: info.size || 0,
      author: strip(meta.Artist?.value || ''),
      license: strip(meta.LicenseShortName?.value || ''),
    })
  }
  return map
}

const directInfo = await lookupFiles([...new Set(Object.values(DIRECT))])

function remember(animal, pick) {
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
}

for (const animal of ANIMALS) {
  const dest = path.join(OUT, `${animal.id}.mp3`)
  if (await exists(dest)) {
    console.log('keep', animal.id)
    continue
  }
  const preset = directInfo.get(DIRECT[animal.id] || '')
  if (preset && !used.has(preset.url)) {
    const saved = await downloadRetry(transcodeMp3(preset.url), dest)
    if (saved) {
      remember(animal, preset)
      await writeFile(creditsPath, JSON.stringify(credits, null, 2))
      console.log('ok', animal.id, preset.title)
      await sleep(900)
      continue
    }
  }
  const spec = SPEC[animal.id] || [animal.id, [animal.id]]
  const pages = await searchRetry(spec[0])
  const ranked = pages
    .map((item) => ({ item, value: score(item, spec[1], spec[2] || []) }))
    .filter((entry) => entry.value > 0 && !used.has(entry.item.url))
    .sort((a, b) => b.value - a.value || a.item.size - b.item.size)
  const pick = ranked[0]?.item
  if (!pick) {
    console.log('miss', animal.id, pages.slice(0, 3).map((item) => item.title).join(' | '))
    await sleep(700)
    continue
  }
  const saved = await downloadRetry(transcodeMp3(pick.url), dest)
  if (saved) {
    remember(animal, pick)
    await writeFile(creditsPath, JSON.stringify(credits, null, 2))
    console.log('ok', animal.id, pick.title)
  } else {
    console.log('fail-dl', animal.id, pick.title)
  }
  await sleep(1100)
}

const have = credits.length
console.log('done', have, '/', ANIMALS.length)
