import argparse, base64, json, os, signal, sqlite3, subprocess, tempfile, time, urllib.error, urllib.request
from pathlib import Path
from urllib.parse import quote, urlparse
from docx import Document
from openpyxl import Workbook
from pptx import Presentation
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--binary', required=True)
parser.add_argument('--qemu')
parser.add_argument('--browser-script')
parser.add_argument('--out',required=True)
parser.add_argument('--smoke',action='store_true')
parser.add_argument('--only')
args=parser.parse_args()
out=Path(args.out).resolve(); out.mkdir(parents=True,exist_ok=True)
for key in list(os.environ):
    if key.lower().endswith('_proxy'): os.environ.pop(key)
urllib.request.install_opener(urllib.request.build_opener(urllib.request.ProxyHandler({})))
test_libs = os.environ.get('INTRANET_TEST_LIBS')
if test_libs: os.environ['LD_LIBRARY_PATH'] = test_libs
base='http://127.0.0.1:15244'; token=''
def api(path,payload=None,method=None,headers=None):
    hdr={'Content-Type':'application/json','Authorization':token}; hdr.update(headers or {})
    req=urllib.request.Request(base+path,data=(payload if isinstance(payload,bytes) else json.dumps(payload).encode()) if payload is not None else None,headers=hdr,method=method)
    try:
        with urllib.request.urlopen(req,timeout=20) as r:
            raw=r.read(); return json.loads(raw)
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def pdf_cjk(file):
    content='内网文档测试'.encode('utf-16-be').hex().upper()
    stream=f'BT /F1 24 Tf 20 150 Td <{content}> Tj ET'.encode()
    objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>',b'<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [5 0 R] >>',b'<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> /FontDescriptor 7 0 R >>',b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream',b'<< /Type /FontDescriptor /FontName /STSong-Light /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 880 /StemV 80 >>']
    data=b'%PDF-1.4\n'; offsets=[0]
    for i,obj in enumerate(objects,1): offsets.append(len(data)); data+=f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n'
    xref=len(data); data+=f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode()+b''.join(f'{x:010d} 00000 n \n'.encode() for x in offsets[1:])
    data+=f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode(); file.write_bytes(data)

with tempfile.TemporaryDirectory(prefix='intranet-test-') as temp:
    root=Path(temp); fixtures=root/'files'; fixtures.mkdir(); data=root/'data'; data.mkdir()
    (data/'config.json').write_text(json.dumps({'scheme':{'address':'127.0.0.1','http_port':15244}}))
    (fixtures/'sample.txt').write_text('Local file roundtrip\n',encoding='utf8')
    (fixtures/'sample.md').write_text('# 内网验证\n\n$$E=mc^2$$\n\n```mermaid\ngraph LR\n A-->B\n```',encoding='utf8')
    with (fixtures/'sample.md').open('a') as f: f.write('\n![external](https://external.example/probe.png)\n<script>window.__intranetXSS=1</script>\n')
    outside=root/'outside';outside.mkdir();(outside/'secret').write_text('must stay private')
    (fixtures/'escape').symlink_to(outside,target_is_directory=True)
    document=Document(); document.add_paragraph('DOCX 内网预览验证'); document.save(fixtures/'sample.docx')
    workbook=Workbook(); workbook.active.append(['XLSX 内网预览验证',42]); workbook.save(fixtures/'sample.xlsx')
    presentation=Presentation(); slide=presentation.slides.add_slide(presentation.slide_layouts[1]); slide.shapes.title.text='PPTX 内网预览验证'; slide.placeholders[1].text='Local presentation'; presentation.save(fixtures/'sample.pptx')
    pdf_cjk(fixtures/'chinese.pdf')
    (fixtures/'disabled.epub').write_bytes(b'file download only')
    (fixtures/'disabled.swf').write_bytes(b'file download only')
    command=([args.qemu] if args.qemu else [])+[str(Path(args.binary).resolve()),'server','--data',str(data)]
    # Log contains initial test credentials; keep it only in the temporary directory.
    log=(root/'server.log').open('w')
    proc=subprocess.Popen(command,stdout=log,stderr=log,start_new_session=True)
    result={'architecture':'arm64-qemu' if args.qemu else 'amd64','network_routes':subprocess.check_output(['ip','route']).decode(),'api':{},'cases':[]}
    try:
        for _ in range(300):
            try:
                settings=api('/api/public/settings'); break
            except Exception: time.sleep(.1)
        else: raise RuntimeError('Server did not start')
        login=api('/api/auth/login', {'username':'admin','password':'admin'})
        assert login['code']==200, 'Default admin login failed'
        result['api']['default_admin_login']=True
        token=login['data']['token']
        for credential in ['', 'not-a-valid-token', 'eyJhbGciOiJub25lIn0.eyJ1c2VybmFtZSI6ImFkbWluIn0.']:
            assert api('/api/admin/storage/list',headers={'Authorization':credential})['code']!=200
        master=api('/api/admin/setting/get?key=token')['data']
        blank=dict(master);blank['value']=''
        assert api('/api/admin/setting/save',[blank])['code']==200
        assert api('/api/admin/storage/list',headers={'Authorization':''})['code']!=200
        assert api('/api/authn/getcredentials',headers={'Authorization':''})['data']==[]
        assert api('/api/admin/setting/save',[master])['code']==200
        result['api']['invalid_and_empty_master_token_rejected']=True

        db=sqlite3.connect(data/'data.db'); token=db.execute("select value from x_setting_items where key='token'").fetchone()[0]; db.close()
        result['api']['settings']={k:settings['data'].get(k) for k in ['logo','favicon','audio_cover','iframe_previews','external_previews','ocr_api','sso_login_enabled','ldap_login_enabled']}
        names=api('/api/admin/driver/names')['data']; result['api']['drivers']=names
        assert set(names)=={'Local','SMB','SFTP','FTP','WebDav','S3','Virtual'},names
        for p in ['/api/auth/sso','/api/auth/sso_callback']:
            reply=api(p); assert reply['code']==403,reply
        assert api('/api/auth/login/ldap',{})['code']==403
        bad=api('/api/admin/storage/create',{'mount_path':'/cloud','driver':'AliyundriveOpen','addition':'{}'})
        assert bad['code']!=200,bad
        result['api']['cloud_create_rejected']=True
        for endpoint in ['https://external.example', 'http://8.8.8.8', 'http://169.254.169.254']:
            forbidden=api('/api/admin/storage/create',{'mount_path':'/blocked','driver':'WebDav','addition':json.dumps({'address':endpoint})})
            assert forbidden['code']!=200
        assert not api('/api/public/offline_download_tools')['data']
        result['api']['public_endpoints_and_offline_tools_blocked']=True

        saved=api('/api/admin/setting/save',[{'key':k,'value':v,'type':'string','group':4} for k,v in [('sso_login_enabled','true'),('ocr_api','https://external.example'),('iframe_previews','{"epub":{"cloud":"https://external.example"}}')]])
        assert saved['code']==200,saved
        for k,expected in [('sso_login_enabled','false'),('ocr_api',''),('iframe_previews','{}')]:
            actual=api('/api/admin/setting/get?key='+k)['data']['value']; assert actual==expected,(k,actual)
        result['api']['settings_policy_enforced']=True
        presets=api('/api/admin/storage/list')['data']['content']
        assert len(presets)==1 and presets[0]['driver']=='Local' and presets[0]['mount_path']=='/'
        assert json.loads(presets[0]['addition'])['root_folder_path']=='/tmp/openlist'
        assert Path('/tmp/openlist').is_dir()
        result['api']['default_tmp_storage_present']=True
        created=api('/api/admin/storage/update',{'id':presets[0]['id'],'mount_path':'/','driver':'Local','addition':json.dumps({'root_folder_path':str(fixtures),'show_hidden':True})})
        assert created['code']==200,created
        listing=api('/api/fs/list',{'path':'/','password':'','page':1,'per_page':100,'refresh':True})
        assert listing['code']==200,listing
        upload=api('/api/fs/put',b'uploaded through API',method='PUT',headers={'File-Path':quote('/uploaded.txt'),'As-Task':'false','Content-Type':'application/octet-stream'})
        assert upload['code']==200,upload
        assert (fixtures/'uploaded.txt').read_bytes()==b'uploaded through API'
        info=api('/api/fs/get',{'path':'/uploaded.txt','password':''})
        with urllib.request.urlopen(info['data']['raw_url']) as r: assert r.read()==b'uploaded through API'
        result['api']['upload_download_roundtrip']=True
        assert api('/api/fs/get',{'path':'/escape/secret','password':''})['code']!=200
        assert api('/api/fs/put',b'bad',method='PUT',headers={'File-Path':quote('/escape/secret'),'As-Task':'false','Content-Type':'application/octet-stream'})['code']!=200
        assert api('/api/fs/put',b'bad',method='PUT',headers={'File-Path':quote('/../traversal.txt'),'As-Task':'false','Content-Type':'application/octet-stream'})['code']!=200
        assert (outside/'secret').read_text()=='must stay private'
        assert not (fixtures/'traversal.txt').exists()
        assert api('/api/fs/put',b'bad',method='PUT',headers={'Authorization':'','File-Path':'/unauthorized.txt','As-Task':'false','Content-Type':'application/octet-stream'})['code']!=200
        assert not (fixtures/'unauthorized.txt').exists()
        result['api']['file_boundary_and_upload_auth_enforced']=True

        if args.browser_script:
            subprocess.run(['node',args.browser_script],env=dict(os.environ,INTRANET_TEST_BASE=base,INTRANET_TEST_TOKEN=token,INTRANET_TEST_OUT=str(out),INTRANET_TEST_FILES=str(fixtures)),check=True)
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-background-networking'])
            paths=['/','/sample.txt','/sample.md','/chinese.pdf','/sample.docx','/sample.xlsx','/sample.pptx','/disabled.epub','/disabled.swf','/@manage/about','/@manage/storages','/@manage/settings/other']
            if args.smoke: paths=['/','/chinese.pdf']
            if args.only: paths=args.only.split(',')
            for route in paths:
                ctx=browser.new_context(locale='zh-CN',service_workers='block')
                ctx.add_init_script('localStorage.setItem("lang","zh-CN"); localStorage.setItem("token",'+json.dumps(token)+')')
                page=ctx.new_page(); case={'path':route,'requests':[],'failed':[],'errors':[],'http_errors':[], 'console': []}
                ctx.on('request',lambda r:case['requests'].append(r.url))
                ctx.on('requestfailed',lambda r:case['failed'].append({'url':r.url,'error':r.failure}))
                ctx.on('response',lambda r:case['http_errors'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
                page.on('pageerror',lambda e:case['errors'].append(str(e)))
                page.on('console',lambda e:case['console'].append(e.text) if e.type in ['error','warning'] else None)
                page.goto(base+route,wait_until='domcontentloaded',timeout=60000)
                page.wait_for_timeout(7000 if route.endswith(('.pdf','.xlsx','.pptx')) else 3000)
                assert page.evaluate('window.__intranetXSS') is None
                case['text']=page.locator('body').inner_text()[:2500]
                assert not any('/pdf-fonts/' in u or '/pdfium' in u or '/ppt.js/' in u or '/docxjs/' in u for u in case['requests']), 'Preview resource unexpectedly loaded'
                case['external']=sorted({u for u in case['requests'] if urlparse(u).scheme in ['https','http'] and urlparse(u).hostname!='127.0.0.1'})
                result['cases'].append(case)
                if route.endswith('/settings/other'): page.locator('input').evaluate_all("inputs => inputs.forEach(input => input.style.visibility = 'hidden')")
                page.screenshot(path=str(out/('screen-'+route.strip('/').replace('/','-')+'.png')),full_page=True)
                # Inspect local library loading in addition to file content, including shadow DOM PPT.
                for ext,label in [('.docx','DOCX 内网预览验证'),('.xlsx','XLSX 内网预览验证'),('.pptx','PPTX 内网预览验证')]:
                    if route.endswith(ext): assert page.get_by_text('下载到本地后',exact=False).count()>0,(route,case['text'])
                print(json.dumps({'path':route,'external':case['external'],'http_errors':case['http_errors'],'errors':case['errors']},ensure_ascii=False),flush=True)
                ctx.close()
            browser.close()
        assert all(not c['external'] for c in result['cases']), 'External requests observed'
        assert all(not c['http_errors'] for c in result['cases']), 'Resource HTTP errors observed'
        for i in range(6):
            reply=api('/api/auth/login',{'username':'admin','password':'wrong'},headers={'X-Forwarded-For':f'10.0.0.{i+1}','X-Real-IP':f'10.0.0.{i+1}'})
        assert reply['code']==429,reply
        result['api']['spoofed_forward_headers_do_not_bypass_login_limit']=True
        def restart_test_server():
            global proc
            os.killpg(proc.pid,signal.SIGTERM)
            proc.wait(timeout=20)
            proc=subprocess.Popen(command,stdout=log,stderr=log,start_new_session=True)
            for _ in range(300):
                try:
                    response=api('/api/admin/storage/list')
                    if response['code']==200: return response['data']['content']
                except Exception: pass
                time.sleep(.1)
            raise RuntimeError('Restart did not complete')
        existing=restart_test_server()
        assert len(existing)==1 and json.loads(existing[0]['addition'])['root_folder_path']==str(fixtures)
        assert api('/api/admin/storage/delete?id='+str(existing[0]['id']),{},method='POST')['code']==200
        assert restart_test_server()==[]
        result['api']['restart_preserves_storage_and_does_not_recreate_deleted_preset']=True
        result['passed']=True
    finally:
        encoded = json.dumps(result, ensure_ascii=False, indent=2)
        encoded = __import__('re').sub(r'([?&]sign=)[^"&]+', r'\1REDACTED', encoded)
        (out/'results.json').write_text(encoded)
        os.killpg(proc.pid,signal.SIGTERM)
        try: proc.wait(timeout=10)
        except subprocess.TimeoutExpired: os.killpg(proc.pid,signal.SIGKILL)
        log.close()
print('PASS: policy, local storage and offline browser checks')
