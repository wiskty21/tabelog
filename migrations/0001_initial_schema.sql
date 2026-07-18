-- Migration number: 0001 	 2026-07-18T05:09:12.582Z
CREATE TABLE writing_samples (
  id TEXT PRIMARY KEY NOT NULL,
  platform TEXT NOT NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('imported', 'approved')),
  source_url TEXT,
  subject_name TEXT,
  title TEXT,
  content TEXT NOT NULL,
  rating REAL
    CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
  metadata_json TEXT
    CHECK (metadata_json IS NULL OR json_valid(metadata_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_writing_samples_platform
  ON writing_samples (platform);

CREATE TABLE style_profiles (
  platform TEXT PRIMARY KEY NOT NULL,
  profile TEXT NOT NULL,
  sample_count INTEGER NOT NULL
    CHECK (sample_count >= 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE drafts (
  id TEXT PRIMARY KEY NOT NULL,
  platform TEXT NOT NULL,
  input_json TEXT NOT NULL
    CHECK (json_valid(input_json)),
  generated_title TEXT,
  generated_body TEXT NOT NULL,
  final_title TEXT,
  final_body TEXT,
  status TEXT NOT NULL
    CHECK (
      status IN ('generated', 'blocked', 'approved', 'rejected')
    ),
  model TEXT NOT NULL,
  check_result_json TEXT NOT NULL
    CHECK (json_valid(check_result_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
