"""Fetch the pinned official kernel with checksum verification. No install/agent commands."""
import hashlib,json,os,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
lock=json.loads((root/'komari.lock.json').read_text())['linuxAmd64']
target=root/'.local/komari-linux-amd64'
target.parent.mkdir(exist_ok=True)
if not target.exists():
    with urllib.request.urlopen(lock['url'],timeout=120) as response: data=response.read()
    if hashlib.sha256(data).hexdigest()!=lock['sha256']:raise SystemExit('Checksum mismatch')
    target.write_bytes(data)
if hashlib.sha256(target.read_bytes()).hexdigest()!=lock['sha256']:raise SystemExit('Checksum mismatch')
os.chmod(target,0o700)
print(target)
