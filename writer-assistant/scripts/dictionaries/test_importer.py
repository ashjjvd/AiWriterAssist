import gzip,pathlib,sqlite3,tempfile,unittest
from build import build,normalized,read_oewn,read_moby
class ImporterTests(unittest.TestCase):
 def test_normalize(self):self.assertEqual(normalized(' CAFÉ '),'café')
 def test_official_format_fixture(self):
  with tempfile.TemporaryDirectory() as d:
   folder=pathlib.Path(d)
   xml=folder/'tiny.xml.gz';moby=folder/'tiny.txt';db=folder/'tiny.sqlite'
   # Test-only fixture; NEVER included as the production lexical database.
   xml.write_bytes(gzip.compress(b'''<LexicalResource><Lexicon>
   <LexicalEntry id="w1"><Lemma writtenForm="good" partOfSpeech="a"/><Sense id="sense1" synset="s1"/></LexicalEntry>
   <LexicalEntry id="w2"><Lemma writtenForm="great" partOfSpeech="a"/><Sense id="sense2" synset="s1"/></LexicalEntry>
   <Synset id="s1"><Definition>having desirable qualities</Definition></Synset>
   </Lexicon></LexicalResource>'''))
   moby.write_text('good,superb,nice\n')
   con=sqlite3.connect(db);stats=build(con,xml,moby,('a','b'))
   self.assertGreater(stats['unique_relations'],0)
   self.assertEqual(con.execute('SELECT count(*) FROM lexical_relations WHERE relation_type="synonym"').fetchone()[0],2)
   self.assertEqual(con.execute('SELECT count(*) FROM lexical_relations WHERE relation_type="related"').fetchone()[0],2)
   con.close()
if __name__=='__main__':unittest.main()
