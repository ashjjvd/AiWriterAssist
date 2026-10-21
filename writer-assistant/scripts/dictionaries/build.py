#!/usr/bin/env python3
"""Reproducible *real-source-only* Moby II + OEWN2025 importer.

Usage:
 python3 scripts/dictionaries/build.py --wordnet /path/english-wordnet-2025.xml.gz --moby /path/pg3202.txt \
   --wordnet-sha256 VERIFIED_SHA256 --moby-sha256 VERIFIED_SHA256

Downloads are opt-in (--download). Offline imports require official source files and SHA-256 hashes.
No production sample data or invented records are substituted for missing sources.
"""
from __future__ import annotations
import argparse
import collections
import gzip
import hashlib
import json
import pathlib
import sqlite3
import tempfile
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[2]
RESOURCE = ROOT / 'src-tauri' / 'resources' / 'dictionaries'
OEWN_URL = 'https://en-word.net/static/english-wordnet-2025.xml.gz'
MOBY_URL = 'https://www.gutenberg.org/cache/epub/3202/pg3202.txt'

def normalized(text: str) -> str:
    return unicodedata.normalize('NFKC', text.strip().replace('_', ' ')).casefold()

def sha256(path: pathlib.Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def check(path: pathlib.Path, required_hash: str) -> str:
    if not path.is_file(): raise FileNotFoundError(f'Missing official lexical source: {path}')
    actual=sha256(path)
    if actual.lower()!=required_hash.lower():raise ValueError(f'Checksum mismatch for {path}: expected {required_hash}, got {actual}')
    return actual

def download(url: str, destination: pathlib.Path) -> None:
    with urllib.request.urlopen(url, timeout=35) as response, destination.open('wb') as out:
        for block in iter(lambda:response.read(1024*1024), b''):out.write(block)

def read_oewn(path: pathlib.Path):
    """Extract lexemes, senses, and same-synset groupings from official WN-LMF."""
    senses: dict[str,list[tuple[str,str,str]]] = collections.defaultdict(list)
    synsets: dict[str,tuple[str,list[tuple[str,str]]]] = {}
    opener=gzip.open if path.suffix=='.gz' else open
    with opener(path,'rb') as reader:
        for _,element in ET.iterparse(reader,events=('end',)):
            tag=element.tag.rsplit('}',1)[-1]
            if tag=='LexicalEntry':
                lemma=next((node for node in element if node.tag.rsplit('}',1)[-1]=='Lemma'),None)
                if lemma is not None:
                    word=lemma.get('writtenForm')
                    pos=lemma.get('partOfSpeech','')
                    if word:
                        for node in element:
                            if node.tag.rsplit('}',1)[-1]=='Sense' and node.get('synset'):
                                senses[node.attrib['synset']].append((word.replace('_',' '),pos,node.get('id','')))
                element.clear()
            elif tag=='Synset':
                definition='; '.join((child.text or '').strip() for child in element if child.tag.rsplit('}',1)[-1]=='Definition').strip()
                relations=[(child.get('target',''),child.get('relType','')) for child in element if child.tag.rsplit('}',1)[-1]=='SynsetRelation']
                if element.get('id'):synsets[element.attrib['id']]=(definition,relations)
                element.clear()
    if not senses or not synsets: raise ValueError('Invalid Open English WordNet LMF: no senses/synsets found')
    return senses,synsets

def read_moby(path:pathlib.Path):
    """Read full original comma-delimited Moby II association records."""
    data=path.read_text(encoding='utf-8-sig',errors='replace')
    for line in data.splitlines():
        line=line.strip()
        if line.startswith('*** END OF THE PROJECT GUTENBERG'):break
        if ',' not in line or line.startswith(('***','http','Moby','Copyright','Public Domain')):continue
        parts=[item.strip() for item in line.split(',') if item.strip()]
        if len(parts)<2 or not (parts[0][0].isalpha()):continue
        # Moby lines contain unannotated associative terms; never infer WordNet senses.
        yield parts[0], parts[1:]

SCHEMA='''PRAGMA foreign_keys=ON;
CREATE TABLE dictionary_sources (id INTEGER PRIMARY KEY,source_name TEXT UNIQUE NOT NULL,version TEXT NOT NULL,download_url TEXT NOT NULL,license_identifier TEXT NOT NULL,source_hash TEXT NOT NULL);
CREATE TABLE lexemes (id INTEGER PRIMARY KEY,language_code TEXT NOT NULL,lemma TEXT NOT NULL,normalized_lemma TEXT NOT NULL,part_of_speech TEXT NOT NULL,UNIQUE(normalized_lemma,part_of_speech));
CREATE INDEX idx_lexemes_normalized ON lexemes(normalized_lemma);
CREATE TABLE senses (id INTEGER PRIMARY KEY,lexeme_id INTEGER NOT NULL REFERENCES lexemes(id),source_id INTEGER NOT NULL REFERENCES dictionary_sources(id),external_sense_id TEXT NOT NULL,definition TEXT NOT NULL,UNIQUE(lexeme_id,source_id,external_sense_id));
CREATE TABLE lexical_relations (id INTEGER PRIMARY KEY,source_id INTEGER NOT NULL REFERENCES dictionary_sources(id),source_lexeme_id INTEGER NOT NULL REFERENCES lexemes(id),target_lexeme_id INTEGER NOT NULL REFERENCES lexemes(id),source_sense_id INTEGER REFERENCES senses(id),target_sense_id INTEGER REFERENCES senses(id),relation_type TEXT NOT NULL,evidence_strength INTEGER NOT NULL,UNIQUE(source_id,source_lexeme_id,target_lexeme_id,source_sense_id,target_sense_id,relation_type));
CREATE INDEX idx_rel_source_type ON lexical_relations(source_lexeme_id,relation_type,evidence_strength DESC);
CREATE INDEX idx_rel_target ON lexical_relations(target_lexeme_id);
'''

def build(conn:sqlite3.Connection, wordnet:pathlib.Path, moby:pathlib.Path, hashes:tuple[str,str]):
    conn.executescript(SCHEMA)
    conn.executemany('INSERT INTO dictionary_sources VALUES (?,?,?,?,?,?)',[
        (1,'Open English WordNet','2025',OEWN_URL,'CC-BY-4.0',hashes[0]),
        (2,'Moby Thesaurus II','Grady Ward public domain 2001',MOBY_URL,'Public-Domain',hashes[1])])
    lexeme_ids:dict[tuple[str,str],int]={}
    sense_ids:dict[tuple[int,str],int]={}
    next_lex=1;next_sense=1
    def lexeme(lemma:str,pos:str)->int:
        nonlocal next_lex
        key=(normalized(lemma),pos)
        if not key[0]:return 0
        if key not in lexeme_ids:
            lexeme_ids[key]=next_lex
            conn.execute('INSERT INTO lexemes VALUES (?,?,?,?,?)',(next_lex,'en',lemma,key[0],pos))
            next_lex+=1
        return lexeme_ids[key]
    def sense(lex:int,external:str,definition:str)->int:
        nonlocal next_sense
        key=(lex,external)
        if key not in sense_ids:
            sense_ids[key]=next_sense
            conn.execute('INSERT INTO senses VALUES (?,?,?,?,?)',(next_sense,lex,1,external,definition))
            next_sense+=1
        return sense_ids[key]
    relations=0
    def relation(source:int,target:int,srcsense:int|None,tgtsense:int|None,source_id:int,kind:str,strength:int):
        nonlocal relations
        if not source or not target or source==target:return
        conn.execute('INSERT OR IGNORE INTO lexical_relations(source_id,source_lexeme_id,target_lexeme_id,source_sense_id,target_sense_id,relation_type,evidence_strength) VALUES (?,?,?,?,?,?,?)',(source_id,source,target,srcsense,tgtsense,kind,strength))
        relations+=1
    groups,synsets=read_oewn(wordnet)
    for synset,words in groups.items():
        definition=synsets.get(synset,('',[]))[0]
        ls=[(lexeme(word,pos),external) for word,pos,external in words]
        ids=[(idx,sense(idx,ext,definition)) for idx,ext in ls if idx]
        for i,(left,lsense) in enumerate(ids):
            for j,(right,rsense) in enumerate(ids):
                if i!=j:relation(left,right,lsense,rsense,1,'synonym',100)
    # Preserve supported WordNet sense-to-sense semantic relations, without
    # conflating taxonomic associations or opposites with true synonyms.
    for src_synset,(_,links) in synsets.items():
        from_words=groups.get(src_synset,[])
        for target_synset,rel_type in links:
            if rel_type not in ('similar','also','hypernym','instance_hypernym','antonym'):
                continue
            to_words=groups.get(target_synset,[])
            kind=('near_synonym' if rel_type in ('similar','also') else
                  'antonym' if rel_type=='antonym' else 'related')
            strength=70 if kind=='near_synonym' else 30
            for from_word,from_pos,from_ext in from_words:
                first=lexeme(from_word,from_pos)
                src_sense=sense(first,from_ext,synsets[src_synset][0])
                for to_word,to_pos,to_ext in to_words:
                    second=lexeme(to_word,to_pos)
                    target_sense=sense(second,to_ext,synsets.get(target_synset,('',[]))[0])
                    relation(first,second,src_sense,target_sense,1,kind,strength)
    for head,associations in read_moby(moby):
        src=lexeme(head,'')
        for word in associations:
            target=lexeme(word,'')
            relation(src,target,None,None,2,'related',20)
    conn.commit()
    return {'unique_lexemes':len(lexeme_ids),'senses':len(sense_ids),'relation_attempts':relations,'unique_relations':conn.execute('SELECT count(*) FROM lexical_relations').fetchone()[0], 'source_counts':{row[0]:row[1] for row in conn.execute('SELECT source_name,(SELECT count(*) FROM lexical_relations WHERE source_id=dictionary_sources.id) FROM dictionary_sources')}}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--wordnet',type=pathlib.Path);p.add_argument('--moby',type=pathlib.Path)
    p.add_argument('--wordnet-sha256',required=True);p.add_argument('--moby-sha256',required=True)
    p.add_argument('--download',action='store_true');p.add_argument('--out',type=pathlib.Path,default=RESOURCE/'lexical.sqlite')
    args=p.parse_args();RESOURCE.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='writer-dictionaries-') as temporary:
        base=pathlib.Path(temporary)
        wordnet=args.wordnet or base/'oewn.xml.gz';moby=args.moby or base/'moby.txt'
        if not args.wordnet:
            if not args.download:raise SystemExit('Provide --wordnet official archive or --download')
            download(OEWN_URL,wordnet)
        if not args.moby:
            if not args.download:raise SystemExit('Provide --moby official text or --download')
            download(MOBY_URL,moby)
        hashes=(check(wordnet,args.wordnet_sha256),check(moby,args.moby_sha256))
        work=base/'lexical.sqlite'
        connection=sqlite3.connect(work)
        try:
            stats=build(connection,wordnet,moby,hashes)
            for required in ['Open English WordNet','Moby Thesaurus II']:
                if stats['source_counts'][required]==0:raise ValueError(f'No real lexical records imported for {required}')
            if connection.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('SQLite integrity check failed')
        finally:connection.close()
        args.out.parent.mkdir(parents=True,exist_ok=True)
        work.replace(args.out)
        manifest={'created_at':datetime.now(timezone.utc).isoformat(),'sources':[{'name':name,'version':version,'url':url,'license':license_id,'sha256':hash_value} for name,version,url,license_id,hash_value in [("Open English WordNet","2025",OEWN_URL,"CC-BY-4.0",hashes[0]),("Moby Thesaurus II","2001",MOBY_URL,"Public-Domain",hashes[1])]],'transformations':['NFKC normalized lookup key','wordnet same-synset senses as synonyms','Moby associations labeled related'],'statistics':stats}
        args.out.with_suffix('.manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
        print(json.dumps(stats,indent=2))
if __name__=='__main__':main()
