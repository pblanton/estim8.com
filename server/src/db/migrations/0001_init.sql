-- Facilitator accounts
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NULL,
  email_verified_at DATETIME NULL,
  status ENUM('pending_verification', 'pending_password', 'active', 'disabled')
    NOT NULL DEFAULT 'pending_verification',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE email_verifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  code CHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_email_verifications_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE password_reset_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE auth_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_auth_sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE card_decks (
  id CHAR(36) PRIMARY KEY,
  owner_id CHAR(36) NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('fibonacci', 'decimal', 'custom') NOT NULL,
  labels JSON NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_card_decks_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_card_decks_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE poker_sessions (
  id CHAR(36) PRIMARY KEY,
  facilitator_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  join_code VARCHAR(10) NOT NULL UNIQUE,
  deck_id CHAR(36) NOT NULL,
  status ENUM('draft', 'active', 'completed') NOT NULL DEFAULT 'draft',
  active_topic_id CHAR(36) NULL,
  completed_at DATETIME NULL,
  purge_at DATETIME NULL,
  last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_poker_sessions_facilitator FOREIGN KEY (facilitator_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_poker_sessions_deck FOREIGN KEY (deck_id) REFERENCES card_decks(id),
  INDEX idx_poker_sessions_facilitator (facilitator_id),
  INDEX idx_poker_sessions_join_code (join_code),
  INDEX idx_poker_sessions_purge_at (purge_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE topics (
  id CHAR(36) PRIMARY KEY,
  poker_session_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  position INT NOT NULL,
  status ENUM('pending', 'active', 'revealed', 'completed') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_topics_session FOREIGN KEY (poker_session_id) REFERENCES poker_sessions(id) ON DELETE CASCADE,
  INDEX idx_topics_session_pos (poker_session_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE poker_sessions
  ADD CONSTRAINT fk_poker_sessions_active_topic FOREIGN KEY (active_topic_id) REFERENCES topics(id) ON DELETE SET NULL;

CREATE TABLE topic_files (
  id CHAR(36) PRIMARY KEY,
  topic_id CHAR(36) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(127) NOT NULL,
  size_bytes BIGINT NOT NULL,
  position INT NOT NULL,
  kind ENUM('image', 'pdf', 'text', 'markdown', 'other') NOT NULL,
  is_generated BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_topic_files_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  CONSTRAINT fk_topic_files_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_topic_files_topic_pos (topic_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE participants (
  id CHAR(36) PRIMARY KEY,
  poker_session_id CHAR(36) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  participant_token_hash CHAR(64) NOT NULL UNIQUE,
  role ENUM('player', 'facilitator') NOT NULL DEFAULT 'player',
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_participants_session FOREIGN KEY (poker_session_id) REFERENCES poker_sessions(id) ON DELETE CASCADE,
  INDEX idx_participants_session (poker_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE topic_votes (
  id CHAR(36) PRIMARY KEY,
  topic_id CHAR(36) NOT NULL,
  participant_id CHAR(36) NOT NULL,
  value VARCHAR(50) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_topic_votes_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  CONSTRAINT fk_topic_votes_participant FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  UNIQUE KEY uq_topic_participant (topic_id, participant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE topic_results (
  id CHAR(36) PRIMARY KEY,
  topic_id CHAR(36) NOT NULL UNIQUE,
  consensus_value VARCHAR(50) NULL,
  notes TEXT NULL,
  votes_snapshot JSON NOT NULL,
  agreement_pct DECIMAL(5, 2) NULL,
  saved_by CHAR(36) NOT NULL,
  saved_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_topic_results_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  CONSTRAINT fk_topic_results_saved_by FOREIGN KEY (saved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
