"""Fail if install.sh pins drift from komari.lock.json."""
import json,re,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
lock=json.loads((root/'komari.lock.json').read_text())
script=(root/'install.sh').read_text()
want={'KOMARI_VERSION':lock['version'],'SHA256_AMD64':lock['linuxAmd64']['sha256'],'SHA256_ARM64':lock['linuxArm64']['sha256']}
bad=[k for k,v in want.items() if not re.search(rf'^{k}={re.escape(v)}(\s|$)',script,re.M)]
if bad: sys.exit('install.sh out of sync with komari.lock.json: '+', '.join(bad))
print('install.sh pins match komari.lock.json')
