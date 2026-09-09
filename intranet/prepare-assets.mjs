import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const web = path.join(root, 'web')
const cache = path.join(root, '.build', 'downloads')
const vendor = path.join(web, 'public/static/vendor')
const lockPath = path.join(root, 'intranet/assets.lock.json')
const update = process.argv.includes('--update-lock')
const offline = process.argv.includes('--offline')
const lock = await fs.readFile(lockPath, 'utf8').then(JSON.parse).catch(() => ({}))
await fs.mkdir(cache, {recursive:true})
await fs.mkdir(vendor, {recursive:true})
const sources = {
  resource: 'https://codeload.github.com/OpenListTeam/OpenList-Resource/tar.gz/950daec45ec423851e172f6296a8fbeeddd0f703',
  jszip2: 'https://registry.npmjs.org/jszip/-/jszip-2.6.1.tgz',
  jszip3: 'https://registry.npmjs.org/jszip/-/jszip-3.10.1.tgz',
  i18n: 'https://github.com/OpenListTeam/OpenList-Frontend/releases/download/v4.2.6/i18n.tar.gz',
}
async function unpack(name,url) {
  const archive=path.join(cache, name+'.tgz')
  try { await fs.access(archive) } catch {
    if (offline) throw new Error(`Offline cache missing: ${archive}`)
    // curl supports standard proxy settings and bounded retries.
    execFileSync('curl',['--fail','--location','--retry','3','--max-time','300',url,'--output',archive],{stdio:['ignore','ignore','inherit']})
  }
  const sha256=crypto.createHash('sha256').update(await fs.readFile(archive)).digest('hex')
  if (!update && (!lock[name] || lock[name].url!==url || lock[name].sha256!==sha256)) throw new Error(`Asset checksum mismatch: ${name}`)
  lock[name]={url,sha256}
  const dest=path.join(cache,name)
  await fs.mkdir(dest,{recursive:true})
  execFileSync('tar',['-xzf',archive,'-C',dest],{stdio:'inherit'})
  return dest
}
async function copy(from,to) { await fs.mkdir(path.dirname(to),{recursive:true}); await fs.cp(from,to,{recursive:true}) }
const resource=path.join(await unpack('resource',sources.resource),'OpenList-Resource-950daec45ec423851e172f6296a8fbeeddd0f703')
for(const name of ['logo','ppt.js','exceljs']) await copy(path.join(resource,name),path.join(vendor,name))
await copy(path.join(resource,'docxjs/dist'),path.join(vendor,'docxjs/dist'))
await copy(path.join(resource,'docxjs/LICENSE'),path.join(vendor,'docxjs/LICENSE'))
await copy(path.join(resource,'LICENSE'),path.join(vendor,'RESOURCE-LICENSE'))
for(const [name,version] of [['jszip2','2.6.1'],['jszip3','3.10.1']]) {
  const src=path.join(await unpack(name,sources[name]),'package')
  await copy(path.join(src,'dist/jszip.min.js'),path.join(vendor,'npm/jszip',version,'dist/jszip.min.js'))
  for(const file of await fs.readdir(src)) if(/license/i.test(file)) await copy(path.join(src,file),path.join(vendor,'npm/jszip',version,file))
}
const i18n=await unpack('i18n',sources.i18n)
async function findDir(dir,name) {
  for(const e of await fs.readdir(dir,{withFileTypes:true})) if(e.isDirectory()) {
    if(e.name===name) return path.join(dir,e.name)
    const found=await findDir(path.join(dir,e.name),name); if(found) return found
  }
}
const zh=await findDir(i18n,'zh-CN'); if(!zh) throw new Error('zh-CN translations missing')
await copy(zh,path.join(web,'src/lang/zh-CN'))
await copy(path.join(web,'src/lang/en/entry.ts'),path.join(web,'src/lang/zh-CN/entry.ts'))

const require=createRequire(path.join(web,'package.json'))
const excelDir=path.dirname(require.resolve('exceljs/package.json'))
await copy(path.join(excelDir,'dist/exceljs.min.js'),path.join(vendor,'exceljs/exceljs.min.js'))
await copy(path.join(excelDir,'LICENSE'),path.join(vendor,'exceljs/LICENSE'))
const snippetRequire=createRequire(require.resolve('@embedpdf/snippet'))
const engineRequire=createRequire(snippetRequire.resolve('@embedpdf/engines'))
const {createCdnFontConfig}=await import(pathToFileURL(snippetRequire.resolve('@embedpdf/engines/pdfium')).href)
const fontConfig=createCdnFontConfig('1.0.0')
function localize(entry) {
  if(Array.isArray(entry)) return entry.map(localize)
  if(typeof entry==='object') return {...entry,url:localize(entry.url)}
  const match=entry.match(/\/fonts-([^@]+)@[^/]+\/fonts\/(.+)$/)
  if(!match) throw new Error(`Unexpected font URL: ${entry}`)
  return `${match[1]}/${match[2]}`
}
for(const key of Object.keys(fontConfig.fonts)) fontConfig.fonts[key]=localize(fontConfig.fonts[key])
if(fontConfig.defaultFont) fontConfig.defaultFont=localize(fontConfig.defaultFont)
for(const lang of ['sc','tc','jp','kr','arabic','hebrew','latin']) {
  const dir=path.resolve(path.dirname(engineRequire.resolve(`@embedpdf/fonts-${lang}`)),'..')
  await copy(path.join(dir,'fonts'),path.join(vendor,'pdf-fonts',lang))
  await copy(path.join(dir,'LICENSE'),path.join(vendor,'pdf-fonts',lang,'LICENSE'))
}
await fs.mkdir(path.join(web,'src/generated'),{recursive:true})
await fs.writeFile(path.join(web,'src/generated/pdf-fonts.json'),JSON.stringify(fontConfig,null,2)+'\n')
const ui=path.join(vendor,'ui-fonts'); await fs.mkdir(ui,{recursive:true})
const sheets={ui:[],signature:[]}
for(const [name,weights,kind] of [['open-sans',[400,600],'ui'],['caveat',[400],'signature'],['dancing-script',[400],'signature'],['great-vibes',[400],'signature'],['pacifico',[400],'signature']]) {
  const dir=path.dirname(require.resolve(`@fontsource/${name}/400.css`))
  for(const weight of weights) {
    let css=await fs.readFile(path.join(dir,`${weight}.css`),'utf8')
    // Each stylesheet keeps its package-specific filenames and font subset ranges.
    css=css.replaceAll('./files/',`./${name}/`)
    sheets[kind].push(css)
  }
  await copy(path.join(dir,'files'),path.join(ui,name))
  await copy(path.join(dir,'LICENSE'),path.join(ui,name,'LICENSE'))
}
for(const [name,parts] of Object.entries(sheets)) await fs.writeFile(path.join(ui,name+'.css'),parts.join('\n'))
await fs.mkdir(path.dirname(lockPath),{recursive:true})
if(update) await fs.writeFile(lockPath,JSON.stringify(lock,null,2)+'\n')
console.log('Local Office resources, PDF fonts and zh-CN translations prepared.')
