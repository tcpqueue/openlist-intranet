from pathlib import Path
import os,subprocess,tempfile,json
root=Path(__file__).resolve().parents[2]
unit=(root/'intranet/openlist-intranet.service').read_text()
assert 'User=root\n' in unit and 'Group=root\n' in unit
assert 'WantedBy=multi-user.target' in unit
assert 'ExecStart=/usr/bin/openlist-intranet server --data /var/lib/openlist-intranet' in unit
for script in ['postinst','prerm','postrm']:
    subprocess.run(['sh','-n',str(root/'intranet'/script)],check=True)
    assert 'useradd' not in (root/'intranet'/script).read_text()
with tempfile.TemporaryDirectory(prefix='package-test-') as folder:
    temp=Path(folder); commands=temp/'bin';commands.mkdir();log=temp/'calls';runtime=temp/'systemd';runtime.mkdir()
    for name in ['install','systemctl','deb-systemd-invoke']:
        stub=commands/name;stub.write_text('#!/bin/sh\nprintf "%s\\n" "'+name+' $*" >> "$TEST_LOG"\n');stub.chmod(0o755)
    env=dict(os.environ,PATH=str(commands)+':'+os.environ['PATH'],TEST_LOG=str(log))
    for name,arg in [('postinst','configure'),('prerm','remove'),('postrm','remove')]:
        script=(root/'intranet'/name).read_text().replace('/run/systemd/system',str(runtime)).replace('/var/lib/openlist-intranet',str(temp/'data'))
        subprocess.run(['sh','-s','--',arg],input=script,text=True,env=env,check=True)
    calls=log.read_text()
    for expected in ['systemctl daemon-reload','systemctl enable openlist-intranet.service','deb-systemd-invoke restart openlist-intranet.service','deb-systemd-invoke stop openlist-intranet.service','systemctl disable openlist-intranet.service']:
        assert expected in calls,expected
result={'root_service':True,'shell_syntax':True,'install_enable_restart':True,'remove_stop_disable':True,'scope':'Maintainer scripts executed with stub commands and temporary paths; not an actual Kylin systemd installation.'}
(root/'.build').mkdir(exist_ok=True)
(root/'.build/package-tests.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS: root service and package lifecycle scripts')
