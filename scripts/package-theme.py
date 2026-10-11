"""Package Komari's native manifest + dist layout. Never deploys anything."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
root=Path(__file__).resolve().parents[1]
app=root/'apps/theme'
manifest=json.loads((app/'komari-theme.json').read_text())
assert manifest['short']=='oioprobe'
assert (app/'dist/index.html').is_file(), 'Build first'
assert (app/manifest['preview']).is_file(), 'Missing preview'
out=root/'artifacts'/f"oioprobe-theme-{manifest['version']}.zip"
out.parent.mkdir(exist_ok=True)
with ZipFile(out,'w',ZIP_DEFLATED) as archive:
    archive.write(app/'komari-theme.json','komari-theme.json')
    archive.write(root/'THIRD-PARTY-NOTICES.md', 'dist/THIRD-PARTY-NOTICES.md')
    for notice in sorted((root/'licenses').glob('*')):
        archive.write(notice, 'dist/licenses/'+notice.name)
    for file in sorted((app/'dist').rglob('*')):
        if file.is_file(): archive.write(file,str(file.relative_to(app)))
with ZipFile(out) as archive:
    assert 'dist/index.html' in archive.namelist()
    assert 'komari-theme.json' in archive.namelist()
    assert all(not name.startswith('/') and '..' not in Path(name).parts for name in archive.namelist())
print(out)
