#!/usr/bin/env python3
"""Verify genuine shipped lexical DB; never synthesize data."""
import hashlib,json,pathlib,sqlite3,sys
root=pathlib.Path(__file__).resolve().parents[2]
path=root/'src-tauri/resources/dictionaries/lexical.sqlite'
manifest=path.with_suffix('.manifest.json')
if not path.exists() or not manifest.exists():
    sys.exit('BLOCKED: real lexical archives were unavailable; lexical.sqlite and manifest not installed. Run dictionary:build with official sources and SHA-256 values.')
conn=sqlite3.connect(f'file:{path}?mode=ro',uri=True)
assert conn.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert conn.execute('SELECT count(*) FROM dictionary_sources').fetchone()[0]==2
assert conn.execute('SELECT count(*) FROM senses').fetchone()[0]>1000
assert conn.execute('SELECT count(*) FROM lexical_relations').fetchone()[0]>10000
assert conn.execute('SELECT count(*) FROM lexical_relations WHERE relation_type="related"').fetchone()[0]>1000
assert conn.execute('SELECT count(*) FROM lexical_relations WHERE relation_type="synonym"').fetchone()[0]>1000
print('VERIFIED real dictionary:',path,'size',path.stat().st_size,'bytes; manifest sources',len(json.loads(manifest.read_text())['sources']))
