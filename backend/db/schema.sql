-- ============================================================
-- PRO MARKET ALGÉRIE — PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE account_type AS ENUM ('individual', 'professional');
CREATE TYPE seller_pack AS ENUM ('free', 'starter_pro', 'business_pro', 'concessionnaire_elite');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(30),
  phone_visible BOOLEAN DEFAULT FALSE,
  role          user_role DEFAULT 'buyer',
  account_type  account_type DEFAULT 'individual',
  pack          seller_pack DEFAULT 'free',
  pack_expires  TIMESTAMP,
  company_name  VARCHAR(255),
  logo_url      VARCHAR(500),
  rc_document   VARCHAR(500),
  is_certified  BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  wilaya_id     SMALLINT,
  commune       VARCHAR(100),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- CATEGORIES (13 main + subcategories)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  name_fr     VARCHAR(200) NOT NULL,
  name_ar     VARCHAR(200) NOT NULL,
  icon        VARCHAR(100),
  parent_id   INTEGER REFERENCES categories(id),
  sort_order  SMALLINT DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────
-- WILAYAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE wilayas (
  id      SMALLINT PRIMARY KEY,
  name_fr VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  code    VARCHAR(5)
);

CREATE TABLE communes (
  id         SERIAL PRIMARY KEY,
  wilaya_id  SMALLINT REFERENCES wilayas(id),
  name_fr    VARCHAR(150) NOT NULL,
  name_ar    VARCHAR(150)
);

-- ─────────────────────────────────────────────────────────────
-- LISTINGS
-- ─────────────────────────────────────────────────────────────
CREATE TYPE listing_status AS ENUM ('pending', 'active', 'rejected', 'sold', 'expired');
CREATE TYPE currency AS ENUM ('DZD', 'EUR');
CREATE TYPE listing_condition AS ENUM ('new', 'excellent', 'good', 'fair', 'for_parts');

CREATE TABLE listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id     INTEGER REFERENCES categories(id),
  subcategory_id  INTEGER REFERENCES categories(id),

  -- Content
  title_fr        VARCHAR(300) NOT NULL,
  title_ar        VARCHAR(300),
  description_fr  TEXT,
  description_ar  TEXT,

  -- Price
  price           NUMERIC(15,2),
  currency        currency DEFAULT 'DZD',
  price_on_contact BOOLEAN DEFAULT FALSE,

  -- Status & visibility
  status          listing_status DEFAULT 'pending',
  is_boosted      BOOLEAN DEFAULT FALSE,
  boost_until     TIMESTAMP,
  is_premium      BOOLEAN DEFAULT FALSE,
  is_carousel     BOOLEAN DEFAULT FALSE,

  -- Location
  wilaya_id       SMALLINT REFERENCES wilayas(id),
  commune         VARCHAR(150),

  -- Technical attributes (JSONB for category-specific fields)
  attributes      JSONB DEFAULT '{}',

  -- Stats
  view_count      INTEGER DEFAULT 0,
  contact_clicks  INTEGER DEFAULT 0,

  -- Moderation
  rejection_reason TEXT,
  moderated_by    UUID REFERENCES users(id),
  moderated_at    TIMESTAMP,

  condition       listing_condition,
  brand           VARCHAR(150),
  year            SMALLINT,
  reference_num   VARCHAR(100),

  expires_at      TIMESTAMP DEFAULT (NOW() + INTERVAL '60 days'),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX idx_listings_fts_fr ON listings USING GIN (to_tsvector('french', coalesce(title_fr,'') || ' ' || coalesce(description_fr,'')));
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_category ON listings(category_id);
CREATE INDEX idx_listings_wilaya ON listings(wilaya_id);
CREATE INDEX idx_listings_boosted ON listings(is_boosted, boost_until);
CREATE INDEX idx_listings_attributes ON listings USING GIN(attributes);

-- ─────────────────────────────────────────────────────────────
-- LISTING MEDIA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE listing_media (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID REFERENCES listings(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  url_thumb   VARCHAR(500),
  sort_order  SMALLINT DEFAULT 0,
  is_cover    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- FAVORITES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id  UUID REFERENCES listings(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- ─────────────────────────────────────────────────────────────
-- INTERNAL MESSAGES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  seller_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(listing_id, buyer_id, seller_id)
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT,
  attachment_url  VARCHAR(500),
  attachment_type VARCHAR(50),
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS / PAYMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TYPE payment_method AS ENUM ('ccp', 'cib', 'edahabia', 'cash');
CREATE TYPE payment_status AS ENUM ('pending', 'validated', 'rejected');

CREATE TABLE subscription_orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  pack           seller_pack NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  currency       currency DEFAULT 'DZD',
  payment_method payment_method,
  payment_status payment_status DEFAULT 'pending',
  receipt_url    VARCHAR(500),
  notes          TEXT,
  validated_by   UUID REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT NOW(),
  validated_at   TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- BOOST ORDERS
-- ─────────────────────────────────────────────────────────────
CREATE TYPE boost_type AS ENUM ('top_list', 'premium_badge', 'carousel');

CREATE TABLE boost_orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id     UUID REFERENCES listings(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  boost_type     boost_type NOT NULL,
  duration_days  SMALLINT DEFAULT 7,
  amount         NUMERIC(10,2),
  payment_status payment_status DEFAULT 'pending',
  starts_at      TIMESTAMP,
  ends_at        TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- PHONE REVEAL LOG (security / anti-scraping)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE phone_reveals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID REFERENCES listings(id) ON DELETE CASCADE,
  viewer_id   UUID REFERENCES users(id),
  viewer_ip   INET,
  revealed_at TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- SEED: WILAYAS (58 wilayas Algeria)
-- ─────────────────────────────────────────────────────────────
INSERT INTO wilayas (id, name_fr, name_ar, code) VALUES
(1,'Adrar','أدرار','01'),(2,'Chlef','الشلف','02'),(3,'Laghouat','الأغواط','03'),
(4,'Oum El Bouaghi','أم البواقي','04'),(5,'Batna','باتنة','05'),(6,'Béjaïa','بجاية','06'),
(7,'Biskra','بسكرة','07'),(8,'Béchar','بشار','08'),(9,'Blida','البليدة','09'),
(10,'Bouira','البويرة','10'),(11,'Tamanrasset','تمنراست','11'),(12,'Tébessa','تبسة','12'),
(13,'Tlemcen','تلمسان','13'),(14,'Tiaret','تيارت','14'),(15,'Tizi Ouzou','تيزي وزو','15'),
(16,'Alger','الجزائر','16'),(17,'Djelfa','الجلفة','17'),(18,'Jijel','جيجل','18'),
(19,'Sétif','سطيف','19'),(20,'Saïda','سعيدة','20'),(21,'Skikda','سكيكدة','21'),
(22,'Sidi Bel Abbès','سيدي بلعباس','22'),(23,'Annaba','عنابة','23'),(24,'Guelma','قالمة','24'),
(25,'Constantine','قسنطينة','25'),(26,'Médéa','المدية','26'),(27,'Mostaganem','مستغانم','27'),
(28,'M''Sila','المسيلة','28'),(29,'Mascara','معسكر','29'),(30,'Ouargla','ورقلة','30'),
(31,'Oran','وهران','31'),(32,'El Bayadh','البيض','32'),(33,'Illizi','إليزي','33'),
(34,'Bordj Bou Arréridj','برج بوعريريج','34'),(35,'Boumerdès','بومرداس','35'),
(36,'El Tarf','الطارف','36'),(37,'Tindouf','تندوف','37'),(38,'Tissemsilt','تيسمسيلت','38'),
(39,'El Oued','الوادي','39'),(40,'Khenchela','خنشلة','40'),(41,'Souk Ahras','سوق أهراس','41'),
(42,'Tipaza','تيبازة','42'),(43,'Mila','ميلة','43'),(44,'Aïn Defla','عين الدفلى','44'),
(45,'Naâma','النعامة','45'),(46,'Aïn Témouchent','عين تموشنت','46'),
(47,'Ghardaïa','غرداية','47'),(48,'Relizane','غليزان','48'),
(49,'El M''ghair','المغير','49'),(50,'El Meniaa','المنيعة','50'),
(51,'Ouled Djellal','أولاد جلال','51'),(52,'Bordj Baji Mokhtar','برج باجي مختار','52'),
(53,'Béni Abbès','بني عباس','53'),(54,'Timimoun','تيميمون','54'),
(55,'Touggourt','تقرت','55'),(56,'Djanet','جانت','56'),
(57,'In Salah','عين صالح','57'),(58,'In Guezzam','عين قزام','58');
