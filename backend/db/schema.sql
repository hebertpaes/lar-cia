-- =====================================================================
-- LAR & CIA — Schema MySQL (tradução relacional do FIRESTORE_SCHEMA.md)
-- MySQL 8.0+ · InnoDB · utf8mb4
-- =====================================================================

CREATE DATABASE IF NOT EXISTS lar_cia
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lar_cia;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS financing_documents;
DROP TABLE IF EXISTS financing_applications;
DROP TABLE IF EXISTS schedule_events;
DROP TABLE IF EXISTS property_reviews;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS property_proximities;
DROP TABLE IF EXISTS property_images;
DROP TABLE IF EXISTS blog_post_tags;
DROP TABLE IF EXISTS blog_posts;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS newsletter_subscriptions;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id                       VARCHAR(64)  NOT NULL,
  name                     VARCHAR(160) NOT NULL,
  email                    VARCHAR(190) NOT NULL,
  avatar_url               VARCHAR(512) NULL,
  is_admin                 BOOLEAN      NOT NULL DEFAULT FALSE,
  approved                 BOOLEAN      NOT NULL DEFAULT FALSE,
  access_level             TINYINT      NOT NULL DEFAULT 0, -- 0=user 1=mod 2=admin 3=admin_full
  perm_manage_sites        BOOLEAN      NOT NULL DEFAULT FALSE,
  perm_manage_panels       BOOLEAN      NOT NULL DEFAULT FALSE,
  perm_approve_users       BOOLEAN      NOT NULL DEFAULT FALSE,
  perm_manage_ads          BOOLEAN      NOT NULL DEFAULT FALSE,
  perm_manage_financing    BOOLEAN      NOT NULL DEFAULT FALSE,
  preferred_category       VARCHAR(64)  NULL,
  phone_number             VARCHAR(32)  NULL,
  whatsapp_opt_in          BOOLEAN      NOT NULL DEFAULT FALSE,
  credit_analysis_consent  BOOLEAN      NOT NULL DEFAULT FALSE,
  data_sharing_consent     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_approved (approved, email),
  KEY idx_users_access (access_level, email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  id          VARCHAR(64)  NOT NULL,
  name        VARCHAR(120) NOT NULL,
  icon        VARCHAR(64)  NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------
CREATE TABLE properties (
  id                  VARCHAR(64)    NOT NULL,
  title               VARCHAR(255)   NOT NULL,
  location            VARCHAR(255)   NOT NULL,
  price               DECIMAL(14,2)  NOT NULL DEFAULT 0,
  bedrooms            INT            NOT NULL DEFAULT 0,
  bathrooms           INT            NOT NULL DEFAULT 0,
  garages             INT            NULL,
  suites              INT            NULL,
  category            VARCHAR(64)    NOT NULL,
  description         TEXT           NULL,
  area                DECIMAL(12,2)  NOT NULL DEFAULT 0,
  rental_type         ENUM('sale','monthly','daily','seasonal') NOT NULL DEFAULT 'sale',
  is_active           BOOLEAN        NOT NULL DEFAULT TRUE,
  year_built          INT            NULL,
  condo_fee           DECIMAL(10,2)  NULL,
  latitude            DECIMAL(10,7)  NULL,
  longitude           DECIMAL(10,7)  NULL,
  is_verified         BOOLEAN        NOT NULL DEFAULT FALSE,
  verification_score  DECIMAL(3,2)   NOT NULL DEFAULT 0,
  verified_by         ENUM('ai','manual','') NOT NULL DEFAULT '',
  verification_notes  TEXT           NULL,
  verified_at         DATETIME       NULL,
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prop_category (category, updated_at),
  KEY idx_prop_rental (rental_type, updated_at),
  KEY idx_prop_active_verified (is_active, is_verified, created_at),
  KEY idx_prop_active_cat_rental (is_active, category, rental_type, updated_at),
  KEY idx_prop_price (price),
  CONSTRAINT fk_prop_category FOREIGN KEY (category)
    REFERENCES categories (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- property images (1:N normalizado de images[])
CREATE TABLE property_images (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  property_id  VARCHAR(64)  NOT NULL,
  url          VARCHAR(512) NOT NULL,
  position     INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_img_property (property_id, position),
  CONSTRAINT fk_img_property FOREIGN KEY (property_id)
    REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- property proximities (1:N de proximities[])
CREATE TABLE property_proximities (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  property_id  VARCHAR(64)  NOT NULL,
  label        VARCHAR(160) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_prox_property (property_id),
  CONSTRAINT fk_prox_property FOREIGN KEY (property_id)
    REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- favorites (N:N user <-> property)
-- ---------------------------------------------------------------------
CREATE TABLE favorites (
  user_id      VARCHAR(64) NOT NULL,
  property_id  VARCHAR(64) NOT NULL,
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, property_id),
  KEY idx_fav_property (property_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- blog_posts
-- ---------------------------------------------------------------------
CREATE TABLE blog_posts (
  id             VARCHAR(64)  NOT NULL,
  slug           VARCHAR(190) NOT NULL,
  title          VARCHAR(255) NOT NULL,
  subtitle       VARCHAR(255) NULL,
  excerpt        VARCHAR(512) NULL,
  body           MEDIUMTEXT   NULL,
  hero_image_url VARCHAR(512) NULL,
  image_credit   VARCHAR(255) NULL,
  author_name    VARCHAR(160) NULL,
  is_featured    BOOLEAN      NOT NULL DEFAULT FALSE,
  priority       INT          NOT NULL DEFAULT 0,
  published_at   DATETIME     NULL,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  scheduled_from DATETIME     NULL,
  scheduled_to   DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_blog_slug (slug),
  KEY idx_blog_featured (is_featured, priority, published_at),
  KEY idx_blog_published (published_at)
) ENGINE=InnoDB;

CREATE TABLE blog_post_tags (
  post_id  VARCHAR(64)  NOT NULL,
  tag      VARCHAR(80)  NOT NULL,
  PRIMARY KEY (post_id, tag),
  KEY idx_tag (tag, post_id),
  CONSTRAINT fk_tag_post FOREIGN KEY (post_id)
    REFERENCES blog_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- property_reviews
-- ---------------------------------------------------------------------
CREATE TABLE property_reviews (
  id           VARCHAR(64)  NOT NULL,
  property_id  VARCHAR(64)  NOT NULL,
  author_name  VARCHAR(160) NOT NULL,
  rating       TINYINT      NOT NULL DEFAULT 5,
  comment      TEXT         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_review_property (property_id, created_at),
  CONSTRAINT fk_review_property FOREIGN KEY (property_id)
    REFERENCES properties (id) ON DELETE CASCADE,
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------
CREATE TABLE leads (
  id                    VARCHAR(64)  NOT NULL,
  name                  VARCHAR(160) NOT NULL,
  email                 VARCHAR(190) NOT NULL,
  phone                 VARCHAR(32)  NULL,
  role                  VARCHAR(40)  NOT NULL DEFAULT 'cliente',
  intent                VARCHAR(40)  NULL,
  source                VARCHAR(40)  NULL,
  is_pep                BOOLEAN      NOT NULL DEFAULT FALSE,
  has_electronic_locks  BOOLEAN      NOT NULL DEFAULT FALSE,
  wants_financing       BOOLEAN      NOT NULL DEFAULT FALSE,
  status                ENUM('novo','contatado','qualificado','ganho','perdido') NOT NULL DEFAULT 'novo',
  notes                 TEXT         NULL,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lead_status (status, created_at),
  KEY idx_lead_role (role, created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- financing_applications
-- ---------------------------------------------------------------------
CREATE TABLE financing_applications (
  id              VARCHAR(64)   NOT NULL,
  user_id         VARCHAR(64)   NULL,
  name            VARCHAR(160)  NOT NULL,
  email           VARCHAR(190)  NOT NULL,
  phone           VARCHAR(32)   NULL,
  monthly_income  DECIMAL(12,2) NULL,
  property_id     VARCHAR(64)   NULL,
  source          VARCHAR(40)   NULL,
  blog_slug       VARCHAR(190)  NULL,
  is_pep          BOOLEAN       NOT NULL DEFAULT FALSE,
  status          ENUM('prospect','client','rejected') NOT NULL DEFAULT 'prospect',
  selected_bank   VARCHAR(80)   NULL,
  wants_insurance BOOLEAN       NOT NULL DEFAULT FALSE,
  cpf             VARCHAR(14)   NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fin_user (user_id, created_at),
  KEY idx_fin_status (status, created_at),
  CONSTRAINT fk_fin_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_fin_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE financing_documents (
  id              BIGINT       NOT NULL AUTO_INCREMENT,
  application_id  VARCHAR(64)  NOT NULL,
  url             VARCHAR(512) NOT NULL,
  kind            VARCHAR(40)  NULL, -- doc | photo | video
  PRIMARY KEY (id),
  KEY idx_doc_app (application_id),
  CONSTRAINT fk_doc_app FOREIGN KEY (application_id)
    REFERENCES financing_applications (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- schedule_events
-- ---------------------------------------------------------------------
CREATE TABLE schedule_events (
  id             VARCHAR(64)  NOT NULL,
  title          VARCHAR(255) NULL,
  start_at       DATETIME     NOT NULL,
  end_at         DATETIME     NULL,
  agent_email    VARCHAR(190) NULL,
  client_name    VARCHAR(160) NULL,
  client_email   VARCHAR(190) NULL,
  client_phone   VARCHAR(32)  NULL,
  property_id    VARCHAR(64)  NULL,
  property_title VARCHAR(255) NULL,
  mode           ENUM('presencial','online') NOT NULL DEFAULT 'presencial',
  status         ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  notes          TEXT         NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sched_agent (agent_email, start_at),
  KEY idx_sched_client (client_email, start_at),
  KEY idx_sched_agent_status (agent_email, status, start_at),
  CONSTRAINT fk_sched_property FOREIGN KEY (property_id)
    REFERENCES properties (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- newsletter_subscriptions
-- ---------------------------------------------------------------------
CREATE TABLE newsletter_subscriptions (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  email       VARCHAR(190) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_news_email (email)
) ENGINE=InnoDB;
