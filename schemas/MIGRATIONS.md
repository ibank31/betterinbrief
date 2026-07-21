# Episode schema migrations

- Authoring schema saat ini: **1.0** (`episode.schema.json`).
- Runtime render schema: **1.1** (dipertahankan dari engine lama).
- Versi baru wajib: (1) file schema baru `episode.schema-<ver>.json`,
  (2) fungsi migrasi di `app/pipeline/schema-migrate.mjs`,
  (3) test regresi di `tests/`.
- `binb validate` menolak schemaVersion yang tidak dikenal, dan menawarkan
  migrasi eksplisit `binb migrate-episode <id>` (tidak pernah otomatis diam-diam).
