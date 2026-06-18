-- ============================================================
-- PRO MARKET ALGÉRIE — SQLite Schema
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  phone_visible INTEGER DEFAULT 0,
  role          TEXT DEFAULT 'buyer' CHECK(role IN ('buyer', 'seller', 'admin')),
  account_type  TEXT DEFAULT 'individual' CHECK(account_type IN ('individual', 'professional')),
  pack          TEXT DEFAULT 'free' CHECK(pack IN ('free', 'starter_pro', 'business_pro', 'concessionnaire_elite')),
  pack_expires  TEXT,
  company_name  TEXT,
  logo_url      TEXT,
  rc_document   TEXT,
  is_certified  INTEGER DEFAULT 0,
  is_active     INTEGER DEFAULT 1,
  wilaya_id     INTEGER,
  commune       TEXT,
  reset_token_hash    TEXT,
  reset_token_expires TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,
  name_fr     TEXT NOT NULL,
  name_ar     TEXT NOT NULL,
  icon        TEXT,
  parent_id   INTEGER,
  sort_order  INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────
-- WILAYAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wilayas (
  id      INTEGER PRIMARY KEY,
  name_fr TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  code    TEXT
);

CREATE TABLE IF NOT EXISTS communes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  wilaya_id  INTEGER,
  name_fr    TEXT NOT NULL,
  name_ar    TEXT
);

-- ─────────────────────────────────────────────────────────────
-- LISTINGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id              TEXT PRIMARY KEY,
  user_id         TEXT,
  category_id     INTEGER,
  subcategory_id  INTEGER,

  title_fr        TEXT NOT NULL,
  title_ar        TEXT,
  description_fr  TEXT,
  description_ar  TEXT,

  price           REAL,
  currency        TEXT DEFAULT 'DZD' CHECK(currency IN ('DZD', 'EUR')),
  price_on_contact INTEGER DEFAULT 0,

  status          TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'rejected', 'sold', 'expired')),
  is_boosted      INTEGER DEFAULT 0,
  boost_until     TEXT,
  is_premium      INTEGER DEFAULT 0,
  is_carousel     INTEGER DEFAULT 0,

  wilaya_id       INTEGER,
  commune         TEXT,

  attributes      TEXT DEFAULT '{}',

  view_count      INTEGER DEFAULT 0,
  contact_clicks  INTEGER DEFAULT 0,

  rejection_reason TEXT,
  moderated_by    TEXT,
  moderated_at    TEXT,

  condition       TEXT CHECK(condition IN ('new', 'excellent', 'good', 'fair', 'for_parts')),
  brand           TEXT,
  year            INTEGER,
  reference_num   TEXT,

  expires_at      TEXT DEFAULT (datetime('now', '+60 days')),
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_wilaya ON listings(wilaya_id);

-- ─────────────────────────────────────────────────────────────
-- LISTING MEDIA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_media (
  id          TEXT PRIMARY KEY,
  listing_id  TEXT,
  url         TEXT NOT NULL,
  url_thumb   TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_cover    INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────
-- FAVORITES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  listing_id  TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, listing_id)
);

-- ─────────────────────────────────────────────────────────────
-- INTERNAL MESSAGES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          TEXT PRIMARY KEY,
  listing_id  TEXT,
  buyer_id    TEXT,
  seller_id   TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(listing_id, buyer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT,
  sender_id       TEXT,
  body            TEXT,
  attachment_url  TEXT,
  attachment_type TEXT,
  is_read         INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS / PAYMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_orders (
  id             TEXT PRIMARY KEY,
  user_id        TEXT,
  pack           TEXT NOT NULL,
  amount         REAL NOT NULL,
  currency       TEXT DEFAULT 'DZD',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'validated', 'rejected')),
  receipt_url    TEXT,
  notes          TEXT,
  validated_by   TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  validated_at   TEXT
);

-- ─────────────────────────────────────────────────────────────
-- BOOST ORDERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boost_orders (
  id             TEXT PRIMARY KEY,
  listing_id     TEXT,
  user_id        TEXT,
  boost_type     TEXT NOT NULL,
  duration_days  INTEGER DEFAULT 7,
  amount         REAL,
  payment_status TEXT DEFAULT 'pending',
  starts_at      TEXT,
  ends_at        TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────
-- PHONE REVEAL LOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_reveals (
  id          TEXT PRIMARY KEY,
  listing_id  TEXT,
  viewer_id   TEXT,
  viewer_ip   TEXT,
  revealed_at TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────
-- ADVERTISEMENTS / PUBLICITÉS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advertisements (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  image_url   TEXT NOT NULL,
  link_url    TEXT,
  position    TEXT DEFAULT 'homepage' CHECK(position IN ('homepage', 'category', 'listing', 'sidebar', 'banner-top', 'banner-bottom')),
  start_date  TEXT,
  end_date    TEXT,
  is_active   INTEGER DEFAULT 1,
  click_count INTEGER DEFAULT 0,
  view_count  INTEGER DEFAULT 0,
  created_by  TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ads_position ON advertisements(position);
CREATE INDEX IF NOT EXISTS idx_ads_active ON advertisements(is_active);

-- ─────────────────────────────────────────────────────────────
-- SEED: WILAYAS (58 wilayas Algeria)
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO wilayas (id, name_fr, name_ar, code) VALUES
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

-- ─────────────────────────────────────────────────────────────
-- SEED: CATEGORIES
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO categories (id, slug, name_fr, name_ar, icon, sort_order) VALUES
(1, 'industrie-usines', 'Industrie & Usines', 'الصناعة والمصانع', 'fa-industry', 1),
(2, 'restauration-hotellerie', 'Restauration & Hôtellerie', 'الإطعام والضيافة', 'fa-utensils', 2),
(3, 'commerce-services', 'Commerce & Services', 'التجارة والخدمات', 'fa-store', 3),
(4, 'sante-medical', 'Santé & Médical', 'الصحة والطب', 'fa-heartbeat', 4),
(5, 'agriculture-peche', 'Agriculture & Pêche', 'الزراعة والصيد', 'fa-tractor', 5),
(6, 'construction-btp', 'Construction & BTP', 'البناء والأشغال', 'fa-hard-hat', 6),
(7, 'transport-logistique', 'Transport & Logistique', 'النقل واللوجستيك', 'fa-truck', 7),
(8, 'informatique-electronique', 'Informatique & Électronique', 'الإعلام الآلي', 'fa-server', 8),
(9, 'evenementiel-loisirs', 'Évènementiel & Loisirs', 'الفعاليات والترفيه', 'fa-music', 9),
(10, 'divers-fonds-commerce', 'Divers Pro & Fonds de Commerce', 'متنوع ومحلات تجارية', 'fa-building', 10),
(11, 'sport-loisirs', 'Sport et Loisir', 'الرياضة والترفيه', 'fa-running', 11),
(12, 'beaute-esthetique-soins', 'Beauté, Esthétique & Soins', 'التجميل والعناية الشخصية', 'fa-spa', 12),
(13, 'divers-equipement-pro', 'Divers Équipement Professionnel', 'معدات مهنية متنوعة', 'fa-tools', 13);
