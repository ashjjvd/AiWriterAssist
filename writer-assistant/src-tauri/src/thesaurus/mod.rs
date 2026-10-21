use crate::errors::{AppError,Result};
use rusqlite::{params,Connection};
use serde::{Deserialize,Serialize};
use unicode_normalization::UnicodeNormalization;
#[derive(Clone,Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Synonym {pub term:String,pub part_of_speech:String,pub relation_type:String,pub definition:Option<String>,pub source:String,pub relevance_score:i32,pub usage_warning:Option<String>}
#[derive(Clone,Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Lookup {pub searched_word:String,pub normalized_word:String,pub total_unique_terms:u64,pub total_relationships:u64,pub groups:Vec<Synonym>,#[serde(skip_serializing_if="Option::is_none")] pub next_cursor:Option<u64>}
pub fn normalize(word:&str)->String{word.trim().nfkc().collect::<String>().to_lowercase()}
pub fn lookup(path:&std::path::Path,word:&str,mode:&str,query:Option<&str>,cursor:u64,page_size:u64)->Result<Lookup>{
 if word.trim().is_empty()||word.len()>100||!(mode=="best"||mode=="all")||page_size==0||page_size>200 {return Err(AppError::new("INVALID_LOOKUP","Invalid word or pagination request.","Enter a word and choose Best or All."))}
 if !path.exists(){return Err(AppError::new("DICTIONARY_UNAVAILABLE","The official lexical database has not been installed.","Run the reproducible dictionary import script."))}
 let conn=Connection::open_with_flags(path,rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(AppError::internal)?;
 let norm=normalize(word);let filter=format!("%{}%",query.unwrap_or("").to_lowercase());
 let restriction=if mode=="best" {"AND r.relation_type IN ('synonym','near_synonym')"}else{""};
 let sql=format!("SELECT DISTINCT target.lemma, COALESCE(target.part_of_speech,''),r.relation_type, s.definition, ds.source_name,r.evidence_strength
   FROM lexemes source JOIN lexical_relations r ON r.source_lexeme_id=source.id
   JOIN lexemes target ON target.id=r.target_lexeme_id
   JOIN dictionary_sources ds ON ds.id=r.source_id
   LEFT JOIN senses s ON s.id=r.target_sense_id
   WHERE source.normalized_lemma=?1 AND lower(target.lemma) LIKE ?2 {restriction}
   ORDER BY r.evidence_strength DESC,lower(target.lemma),ds.source_name LIMIT ?3 OFFSET ?4");
 let count_sql=format!("SELECT count(DISTINCT target.normalized_lemma) FROM lexemes source JOIN lexical_relations r ON r.source_lexeme_id=source.id JOIN lexemes target ON target.id=r.target_lexeme_id WHERE source.normalized_lemma=?1 AND lower(target.lemma) LIKE ?2 {restriction}");
 let rel_count_sql=format!("SELECT count(*) FROM (SELECT DISTINCT target.lemma,COALESCE(target.part_of_speech,''),r.relation_type,s.definition,ds.source_name,r.evidence_strength FROM lexemes source JOIN lexical_relations r ON r.source_lexeme_id=source.id JOIN lexemes target ON target.id=r.target_lexeme_id JOIN dictionary_sources ds ON ds.id=r.source_id LEFT JOIN senses s ON s.id=r.target_sense_id WHERE source.normalized_lemma=?1 AND lower(target.lemma) LIKE ?2 {restriction})");
 let total:u64=conn.query_row(&count_sql,params![norm,filter],|row|row.get(0))?;
 let relationships:u64=conn.query_row(&rel_count_sql,params![norm,filter],|row|row.get(0))?;
 let mut stmt=conn.prepare(&sql)?;
 let rows=stmt.query_map(params![norm,filter,page_size,cursor],|row|{
  let typ:String=row.get(2)?;Ok(Synonym{term:row.get(0)?,part_of_speech:row.get(1)?,relation_type:typ.clone(),definition:row.get(3)?,source:row.get(4)?,relevance_score:row.get(5)?,usage_warning:if typ=="related"{Some("Related concept; not necessarily interchangeable.".into())}else if typ=="antonym"{Some("Opposite meaning: not a synonym.".into())}else{None}})
 })?;
 let groups:Vec<Synonym>=rows.collect::<std::result::Result<_,_>>()?;
 let next=if cursor+page_size<relationships {Some(cursor+page_size)}else{None};
 Ok(Lookup{searched_word:word.into(),normalized_word:norm,total_unique_terms:total,total_relationships:relationships,groups,next_cursor:next})
}
#[cfg(test)]mod tests {use super::*;#[test]fn normalization(){assert_eq!(normalize("  CAT "),"cat");}#[test]fn missing_source_is_error(){assert!(lookup(std::path::Path::new("/nonexistent/words.db"),"book","all",None,0,30).is_err());}}
