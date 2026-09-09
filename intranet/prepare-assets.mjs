import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
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
await copy(path.join(resource,'logo'),path.join(vendor,'logo'))
await copy(path.join(resource,'LICENSE'),path.join(vendor,'RESOURCE-LICENSE'))
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

for (const name of ['pdf-fonts','ui-fonts','npm','ppt.js','docxjs','exceljs']) {
  await fs.rm(path.join(vendor,name),{recursive:true,force:true})
}
if(update) await fs.writeFile(lockPath,JSON.stringify(lock,null,2)+'\n')
console.log('Local branding and zh-CN translations prepared; online preview assets removed.')
