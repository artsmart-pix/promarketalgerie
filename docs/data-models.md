# Modèle de données — Pro Market Algérie (SQLite)

Source : `backend/db/schema-sqlite.sql`. Identifiants des entités métier = UUID texte (`crypto.randomUUID()`), sauf `categories`/`communes` (auto-increment) et `wilayas` (id fixe 1–58).

## Tables

### `users`
`id` (PK, uuid), `email` (unique), `password_hash`, `full_name`, `phone`, `phone_visible`, `role` ∈ {buyer, seller, admin}, `account_type` ∈ {individual, professional}, `pack` ∈ {free, starter_pro, business_pro, concessionnaire_elite}, `pack_expires`, `company_name`, `logo_url`, `rc_document`, `is_certified`, `is_active`, `wilaya_id`, `commune`, `created_at`, `updated_at`.

### `listings`
`id` (PK, uuid), `user_id` → users, `category_id`, `subcategory_id`, `title_fr/ar`, `description_fr/ar`, `price`, `currency` ∈ {DZD, EUR}, `price_on_contact`, `status` ∈ {pending, active, rejected, sold, expired}, `is_boosted`, `boost_until`, `is_premium`, `is_carousel`, `wilaya_id`, `commune`, `attributes` (JSON texte), `view_count`, `contact_clicks`, `rejection_reason`, `moderated_by`, `moderated_at`, `condition` ∈ {new, excellent, good, fair, for_parts}, `brand`, `year`, `reference_num`, `expires_at` (+60j), `created_at`, `updated_at`. Index : status, category, wilaya.

### `categories` / `wilayas` / `communes`
Référentiel. `categories` (slug unique, name_fr/ar, icon) seedé avec 13 rubriques. `wilayas` seedé avec les 58 wilayas. `communes` rattachées à une wilaya.

### `listing_media`
`id` (PK), `listing_id`, `url`, `url_thumb`, `sort_order`, `is_cover`, `created_at`.

### `favorites`
`id` (PK), `user_id`, `listing_id`, `created_at`, **UNIQUE(user_id, listing_id)**.

### `alerts`
`id` (PK), `user_id`, `label`, `filters` (JSON texte), `notify_email`, `notify_sms`, `is_active`, `last_sent`, `created_at`.

### `conversations` / `messages`
`conversations` : `id`, `listing_id`, `buyer_id`, `seller_id`, **UNIQUE(listing_id, buyer_id, seller_id)**. `messages` : `id`, `conversation_id`, `sender_id`, `body`, `attachment_url`, `attachment_type`, `is_read`, `created_at`. Index : (conversation_id, created_at).

### `subscription_orders`
`id`, `user_id`, `pack`, `amount`, `currency`, `payment_method`, `payment_status` ∈ {pending, validated, rejected}, `receipt_url`, `notes`, `validated_by`, `created_at`, `validated_at`.

### `boost_orders`
`id`, `listing_id`, `user_id`, `boost_type`, `duration_days`, `amount`, `payment_status`, `starts_at`, `ends_at`, `created_at`.

### `phone_reveals`
`id`, `listing_id`, `viewer_id`, `viewer_ip`, `revealed_at` — journal des révélations de numéro.

### `advertisements`
`id`, `title`, `image_url`, `link_url`, `position` ∈ {homepage, category, listing, sidebar, banner-top, banner-bottom}, `start_date`, `end_date`, `is_active`, `click_count`, `view_count`, `created_by`, timestamps. Index : position, is_active.

## Relations (logiques)

```
users 1───* listings 1───* listing_media
users 1───* favorites *───1 listings
users 1───* alerts
users 1───* subscription_orders
users 1───* boost_orders *───1 listings
listings 1───* conversations 1───* messages
conversations.buyer_id / seller_id ──> users
```

### `listings_fts` (recherche plein-texte)
Table virtuelle **FTS5** (`db/fts.js`) miroir des colonnes texte de `listings` (`title_fr`, `description_fr`, `title_ar`, `description_ar`), clé `id` (UNINDEXED). Synchronisée par triggers `AFTER INSERT/UPDATE/DELETE`, tokenizer `unicode61 remove_diacritics 1` (recherche insensible aux accents). Mise en place idempotente + backfill au démarrage de l'app (`ensureFts`). La recherche `GET /api/listings?q=` l'utilise via `MATCH` (préfixe).

## Remarques d'intégrité (voir audit)
- **Aucune contrainte `FOREIGN KEY` déclarée** dans le schéma : les liens sont applicatifs. `PRAGMA foreign_keys = ON` est activé mais sans FK déclarées il n'a pas d'effet. Les suppressions en cascade sont gérées manuellement dans le code (`DELETE FROM listings/:id`).
- `attributes` et `filters` sont du JSON stocké en texte ; interrogé via `json_extract`.
