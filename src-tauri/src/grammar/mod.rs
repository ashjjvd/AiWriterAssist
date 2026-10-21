use crate::errors::{AppError, Result};
use harper_core::{
    linting::{LintGroup, LintKind, Linter},
    parsers::PlainEnglish,
    spell::FstDictionary,
    Dialect, Document,
};
use serde::{Deserialize, Serialize};
use std::time::Instant;
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Issue {
    pub issue_id: String,
    pub start_offset: usize,
    pub end_offset: usize,
    pub original_text: String,
    pub category: String,
    pub priority: u8,
    pub explanation: String,
    pub suggestions: Vec<String>,
    pub rule_identifier: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GrammarResult {
    pub issues: Vec<Issue>,
    pub analyzed_character_count: usize,
    pub duration_ms: u128,
    pub warnings: Vec<String>,
}
// Harper indexes Unicode scalar values; JavaScript string slicing uses UTF-16 code units.
pub fn char_index_to_utf16(text: &str, index: usize) -> Option<usize> {
    if index > text.chars().count() {
        return None;
    }
    Some(text.chars().take(index).map(char::len_utf16).sum())
}
pub fn apply_correction(text: &str, issue: &Issue, replacement: &str) -> Result<String> {
    if issue.start_offset > issue.end_offset {
        return Err(invalid_range());
    }
    let start = utf16_to_byte(text, issue.start_offset).ok_or_else(invalid_range)?;
    let end = utf16_to_byte(text, issue.end_offset).ok_or_else(invalid_range)?;
    if start > end || &text[start..end] != issue.original_text {
        return Err(AppError::new(
            "STALE_CORRECTION",
            "The original text no longer matches this suggestion.",
            "Recheck grammar before applying changes.",
        ));
    }
    let mut result = String::with_capacity(text.len() + replacement.len());
    result.push_str(&text[..start]);
    result.push_str(replacement);
    result.push_str(&text[end..]);
    Ok(result)
}
fn utf16_to_byte(text: &str, offset: usize) -> Option<usize> {
    let mut pos = 0;
    for (byte, ch) in text.char_indices() {
        if pos == offset {
            return Some(byte);
        };
        pos += ch.len_utf16();
        if pos > offset {
            return None;
        }
    }
    if pos == offset {
        Some(text.len())
    } else {
        None
    }
}
fn invalid_range() -> AppError {
    AppError::new(
        "INVALID_OFFSET",
        "Correction could not be safely located.",
        "Re-run grammar analysis.",
    )
}
pub fn apply_all(text: &str, edits: &[(Issue, String)]) -> Result<String> {
    let mut sorted = edits.to_vec();
    sorted.sort_by_key(|(i, _)| std::cmp::Reverse(i.start_offset));
    let mut prev_start = usize::MAX;
    let mut result = text.to_owned();
    for (issue, replacement) in sorted {
        if issue.end_offset > prev_start {
            continue;
        }
        result = apply_correction(&result, &issue, &replacement)?;
        prev_start = issue.start_offset;
    }
    Ok(result)
}
pub fn check(text: &str, personal_dictionary: &[String], dialect: &str) -> GrammarResult {
    let start = Instant::now();
    let mut warnings = vec![];
    if text
        .chars()
        .any(|ch| ('\u{0600}'..='\u{06ff}').contains(&ch))
    {
        return GrammarResult{issues:vec![],analyzed_character_count:0,duration_ms:start.elapsed().as_millis(),warnings:vec!["Offline grammar is English-focused. This mixed/Urdu text was not checked to avoid false corrections.".into()]};
    }
    // Roman Urdu/Hinglish cannot be reliably distinguished from English using script alone.
    // The user can disable offline grammar per session for non-English writing.
    let parser = PlainEnglish;
    let document = Document::new_curated(text, &parser);
    let mut linter = LintGroup::new_curated(
        FstDictionary::curated(),
        if dialect == "British" {
            Dialect::British
        } else {
            Dialect::American
        },
    );
    let chars: Vec<char> = text.chars().collect();
    let dictionary: std::collections::HashSet<String> = personal_dictionary
        .iter()
        .map(|s| s.to_lowercase())
        .collect();
    let mut issues = Vec::new();
    for (idx, lint) in linter.lint(&document).into_iter().enumerate() {
        let (s, e) = (lint.span.start, lint.span.end);
        if s >= e || e > chars.len() {
            warnings.push("One invalid Harper span was omitted.".into());
            continue;
        }
        let original: String = chars[s..e].iter().collect();
        if matches!(lint.lint_kind, LintKind::Spelling)
            && dictionary.contains(&original.to_lowercase())
        {
            continue;
        }
        let a = char_index_to_utf16(text, s).unwrap_or(0);
        let b = char_index_to_utf16(text, e).unwrap_or(0);
        let mut suggestions = vec![];
        for sug in &lint.suggestions {
            let mut altered = chars.clone();
            sug.apply(lint.span, &mut altered);
            let suffix_count = chars.len() - e;
            if altered.len() >= s + suffix_count {
                let term: String = altered[s..altered.len() - suffix_count].iter().collect();
                if !suggestions.contains(&term) {
                    suggestions.push(term)
                }
            }
        }
        issues.push(Issue {
            issue_id: format!("{idx}:{s}:{e}"),
            start_offset: a,
            end_offset: b,
            original_text: original,
            category: format!("{:?}", lint.lint_kind),
            priority: lint.priority,
            explanation: lint.message,
            suggestions,
            rule_identifier: format!("{:?}", lint.lint_kind),
        });
    }
    GrammarResult {
        issues,
        analyzed_character_count: chars.len(),
        duration_ms: start.elapsed().as_millis(),
        warnings,
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unicode_offsets() {
        let text = "a😀éاb";
        assert_eq!(char_index_to_utf16(text, 2), Some(3));
        assert_eq!(char_index_to_utf16(text, 4), Some(5));
        assert_eq!(utf16_to_byte(text, 2), None);
    }
    #[test]
    fn correction_checks_original() {
        let issue = Issue {
            issue_id: "1".into(),
            start_offset: 1,
            end_offset: 3,
            original_text: "😀".into(),
            category: "".into(),
            priority: 1,
            explanation: "".into(),
            suggestions: vec![],
            rule_identifier: "".into(),
        };
        assert_eq!(apply_correction("a😀b", &issue, "ok").unwrap(), "aokb");
        assert!(apply_correction("axb", &issue, "ok").is_err());
    }
    #[test]
    fn skips_conflicting_edits() {
        let make = |s, e, o: &str| Issue {
            issue_id: "".into(),
            start_offset: s,
            end_offset: e,
            original_text: o.into(),
            category: "".into(),
            priority: 1,
            explanation: "".into(),
            suggestions: vec![],
            rule_identifier: "".into(),
        };
        assert_eq!(
            apply_all(
                "hello",
                &[
                    (make(0, 2, "he"), "H".into()),
                    (make(1, 3, "el"), "E".into())
                ]
            )
            .unwrap(),
            "hElo"
        );
    }
}
