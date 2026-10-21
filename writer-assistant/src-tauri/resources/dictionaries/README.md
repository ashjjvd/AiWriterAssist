The bundled `lexical.sqlite` and `lexical.manifest.json` must be built from official
Open English WordNet 2025 and Grady Ward Moby Thesaurus II sources. This environment
had no DNS access, so those files are intentionally ABSENT, not replaced by a dummy DB.
See scripts/dictionaries/build.py. Build and verify before packaging a release.
