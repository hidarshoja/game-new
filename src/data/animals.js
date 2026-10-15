const RAW = `
cat|گربه|🐱
dog|سگ|🐶
rabbit|خرگوش|🐰
bird|پرنده|🐦
fox|روباه|🦊
bear|خرس|🐻
lion|شیر|🦁
tiger|ببر|🐯
wolf|گرگ|🐺
elephant|فیل|🐘
giraffe|زرافه|🦒
zebra|گورخر|🦓
horse|اسب|🐴
cow|گاو|🐮
pig|خوک|🐷
sheep|گوسفند|🐑
goat|بز|🐐
chicken|مرغ|🐔
rooster|خروس|🐓
chick|جوجه|🐤
duck|اردک|🦆
goose|غاز|🪿
frog|قورباغه|🐸
monkey|میمون|🐵
gorilla|گوریل|🦍
panda|پاندا|🐼
koala|کوالا|🐨
kangaroo|کانگورو|🦘
bat|خفاش|🦇
owl|جغد|🦉
eagle|عقاب|🦅
parrot|طوطی|🦜
penguin|پنگوئن|🐧
swan|قو|🦢
peacock|طاووس|🦚
flamingo|فلامینگو|🦩
dove|کبوتر|🕊️
crow|کلاغ|🐦‍⬛
sparrow|گنجشک|🐤
nightingale|بلبل|🎵
fish|ماهی|🐟
goldfish|ماهی قرمز|🐠
shark|کوسه|🦈
whale|نهنگ|🐳
dolphin|دلفین|🐬
octopus|اختاپوس|🐙
crab|خرچنگ|🦀
shrimp|میگو|🦐
turtle|لاک‌پشت|🐢
snake|مار|🐍
lizard|مارمولک|🦎
crocodile|تمساح|🐊
snail|حلزون|🐌
butterfly|پروانه|🦋
bee|زنبور|🐝
ladybug|کفش‌دوزک|🐞
ant|مورچه|🐜
spider|عنکبوت|🕷️
cricket|جیرجیرک|🦗
fly|مگس|🪰
mosquito|پشه|🦟
worm|کرم|🪱
camel|شتر|🐪
llama|لاما|🦙
rhino|کرگدن|🦏
hippo|اسب آبی|🦛
buffalo|گاومیش|🐃
deer|گوزن|🦌
moose|گوزن شمالی|🫎
hedgehog|جوجه تیغی|🦔
raccoon|راکون|🦝
badger|گورکن|🦡
otter|سمور|🦦
squirrel|سنجاب|🐿️
hamster|همستر|🐹
mouse|موش|🐭
hare|خرگوش وحشی|🐇
ostrich|شترمرغ|🪶
turkey|بوقلمون|🦃
vulture|کرکس|🦅
pelican|پلیکان|🪽
seal|فک|🦭
walrus|گراز دریایی|🦭
orca|نهنگ قاتل|🐋
tropical|ماهی گرمسیری|🐡
stingray|سفره‌ماهی|🐟
jellyfish|عروس دریایی|🎐
hermit|خرچنگ گوشه‌گیر|🦀
scorpion|عقرب|🦂
centipede|هزارپا|🐛
firefly|کرم شب‌تاب|✨
dragonfly|سنجاقک|🪰
locust|ملخ|🦗
silkworm|کرم ابریشم|🐛
honeybee|زنبور عسل|🍯
bactrian|شتر دوکوهانه|🐫
ox|گاو نر|🐂
calf|گوساله|🐄
lamb|بره|🐑
puppy|توله سگ|🐕
kitten|بچه گربه|🐈
owlet|جغد کوچک|🦉
falcon|شاهین|🦅
canary|قناری|🐤
lovebird|مرغ عشق|🦜
polar|خرس قطبی|🐻‍❄️
leopard|پلنگ|🐆
cheetah|یوزپلنگ|🐈
hyena|کفتار|🐺
jackal|شغال|🦊
arcticfox|روباه قطبی|🦊
puma|شیر کوهی|🦁
skunk|راسوی بدبو|🦨
sloth|تنبل|🦥
orangutan|اورانگوتان|🦧
chipmunk|سنجاب راه‌راه|🐿️
beaver|بیدستر|🦫
boar|گراز|🐗
donkey|الاغ|🫏
bull|گاو وحشی|🐂
ram|قوچ|🐏
chickadee|چرخ ریسک|🐦
woodpecker|دارکوب|🪵
hummingbird|مرغ مگس‌خوار|🐦
seagull|کاکایی|🪶
stork|لک‌لک|🪽
`.trim()

export const ANIMALS = RAW.split('\n').map((line) => {
  const [id, name, emoji] = line.split('|')
  return { id, name, emoji }
})

export const SOUND_LEVELS = [
  { choices: 2, rounds: 4, seconds: 18, pool: 8 },
  { choices: 3, rounds: 5, seconds: 16, pool: 16 },
  { choices: 3, rounds: 5, seconds: 14, pool: 28 },
  { choices: 4, rounds: 6, seconds: 13, pool: 40 },
  { choices: 4, rounds: 6, seconds: 12, pool: 55 },
  { choices: 4, rounds: 6, seconds: 11, pool: 70 },
  { choices: 5, rounds: 7, seconds: 10, pool: 85 },
  { choices: 5, rounds: 7, seconds: 10, pool: 100 },
  { choices: 6, rounds: 8, seconds: 9, pool: 110 },
  { choices: 6, rounds: 8, seconds: 8, pool: 120 },
]

export function pickRound(pool, choices, random = Math.random) {
  const size = Math.min(choices, pool.length)
  const answer = pool[Math.floor(random() * pool.length)]
  const rest = pool.filter((animal) => animal.id !== answer.id)
  const options = [answer]
  while (options.length < size && rest.length) {
    const index = Math.floor(random() * rest.length)
    options.push(rest.splice(index, 1)[0])
  }
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { answer, options }
}
