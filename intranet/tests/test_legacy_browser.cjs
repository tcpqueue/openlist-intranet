const fs = require('fs');
const uploadContent='Uploaded through Chromium 70 UI'.repeat(70000);
const path = require('path');
const puppeteer = require(process.env.INTRANET_PUPPETEER);
(async function () {
  const browser = await puppeteer.launch({executablePath:process.env.INTRANET_LEGACY_CHROME,headless:true,args:['--no-sandbox','--disable-background-networking','--disable-dev-shm-usage']});
  const page = await browser.newPage();
  await page.setViewport({width:1280,height:800});
  const result={browser:await browser.version(),requests:[],errors:[],console:[],cases:[]};
  page.on('request',r=>result.requests.push(r.url()));
  page.on('pageerror',e=>result.errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error') result.console.push(m.text());});
  await page.evaluateOnNewDocument(function (token) {localStorage.setItem('lang','zh-CN');localStorage.setItem('token',token);},process.env.INTRANET_TEST_TOKEN);
  try {
    const login = await browser.newPage();
    login.on('pageerror',e=>result.errors.push(String(e)));
    await login.evaluateOnNewDocument(function(){localStorage.clear();localStorage.setItem('lang','zh-CN');});
    await login.goto(process.env.INTRANET_TEST_BASE+'/@login',{waitUntil:'networkidle0'});
    await login.type('input[name=username]','admin');
    await login.type('input[name=password]','admin');
    await login.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='登录').click());
    await login.waitForFunction(()=>!location.pathname.includes('@login'),{timeout:15000});
    result.login=true;
    await login.close();
    for (const route of ['/','/sample.txt','/chinese.pdf','/sample.docx','/@manage/storages','/@manage/settings/other']) {
      await page.goto(process.env.INTRANET_TEST_BASE+route,{waitUntil:'networkidle0',timeout:60000});
      await page.waitFor(1500);
      const text=await page.evaluate(()=>document.body.innerText);
      result.cases.push({route,text});
      if(route==='/') {
        const width=await page.$eval('.home-container',e=>e.getBoundingClientRect().width);
        if(width<950) throw new Error('File list is too narrow: '+width);
        result.contentWidth=width;
      }
      if(/\.(txt|pdf|docx)$/.test(route)&&!text.includes('下载到本地后')) throw new Error('Missing download view');
      if(route.endsWith('/other')) await page.evaluate(()=>document.querySelectorAll('input').forEach(input=>input.style.visibility='hidden'));
      await page.screenshot({path:path.join(process.env.INTRANET_TEST_OUT,'old-'+route.replace(/\//g,'_')+'.png'),fullPage:true});
    }
    await page.goto(process.env.INTRANET_TEST_BASE+'/',{waitUntil:'networkidle0'});
    await page.click('.toolbar-toggle');
    await page.waitForSelector('.toolbar-mkdir',{visible:true});
    await page.click('.toolbar-mkdir');
    await page.waitForSelector('#modal-input',{visible:true});
    await page.type('#modal-input','旧浏览器测试');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.body.innerText.includes('旧浏览器测试')&&!document.querySelector('#modal-input'),{timeout:15000});
    result.mkdir=true;
    await page.click('.toolbar-upload');
    await page.waitForSelector('input[type=file]');
    const uploadPath=path.join(process.env.INTRANET_TEST_OUT,'old-ui-upload.txt');
    fs.writeFileSync(uploadPath,uploadContent);
    const fileInput=await page.$('input[type=file]:not([webkitdirectory])');
    await fileInput.uploadFile(uploadPath);
    for(let i=0;i<60&&!fs.existsSync(path.join(process.env.INTRANET_TEST_FILES,'old-ui-upload.txt'));i++) await page.waitFor(250);
    if(!fs.existsSync(path.join(process.env.INTRANET_TEST_FILES,'old-ui-upload.txt'))) throw new Error('UI upload failed: '+await page.evaluate(()=>document.body.innerText));
    if(fs.readFileSync(path.join(process.env.INTRANET_TEST_FILES,'old-ui-upload.txt'),'utf8')!==uploadContent) throw new Error('Upload content mismatch');
    result.upload=true;
    await page.screenshot({path:path.join(process.env.INTRANET_TEST_OUT,'old-upload.png'),fullPage:true});
    await page.goto(process.env.INTRANET_TEST_BASE+'/old-ui-upload.txt',{waitUntil:'networkidle0'});
    const downloads=fs.mkdtempSync(path.join(process.env.INTRANET_TEST_OUT,'downloads-'));
    await page._client.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
    await page.click('a[download]');
    for(let i=0;i<40&&!fs.existsSync(path.join(downloads,'old-ui-upload.txt'));i++) await page.waitFor(250);
    if(!fs.existsSync(path.join(downloads,'old-ui-upload.txt'))) throw new Error('Browser download did not finish');
    if(fs.readFileSync(path.join(downloads,'old-ui-upload.txt'),'utf8')!==uploadContent) throw new Error('Download content mismatch');
    result.download=true;
    for(const width of [1024,640]) {
      await page.setViewport({width,height:800});
      await page.goto(process.env.INTRANET_TEST_BASE+'/',{waitUntil:'networkidle0'});
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)) throw new Error('Horizontal overflow at '+width);
      await page.screenshot({path:path.join(process.env.INTRANET_TEST_OUT,'old-width-'+width+'.png'),fullPage:true});
    }
  } finally {
    result.lastText=await page.evaluate(()=>document.body.innerText);
    await page.screenshot({path:path.join(process.env.INTRANET_TEST_OUT,'old-last.png'),fullPage:true});
    result.external=result.requests.filter(u=>/^https?:/.test(u)&&!u.startsWith(process.env.INTRANET_TEST_BASE+'/'));
    fs.writeFileSync(path.join(process.env.INTRANET_TEST_OUT,'old-browser.json'),JSON.stringify(result,null,2).replace(/([?&]sign=)[^"&]+/g,'$1REDACTED'));
    await browser.close();
  }
  console.log(JSON.stringify({browser:result.browser,errors:result.errors,external:result.external,cases:result.cases.map(c=>({route:c.route,text:c.text.slice(0,450)}))}));
  if(result.errors.length||result.external.length) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
