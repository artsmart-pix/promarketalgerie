const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.all(`
  SELECT l.id, l.title_fr, l.created_at,
    (SELECT COUNT(*) FROM listing_media lm WHERE lm.listing_id = l.id) as image_count
  FROM listings l
  WHERE l.status = 'active'
  ORDER BY l.created_at DESC
  LIMIT 5
`, (err, rows) => {
  if (err) console.error(err);
  else {
    console.log('Dernieres annonces et nombre d\'images:');
    rows.forEach(r => {
      console.log('- ' + r.title_fr + ' (ID: ' + r.id + ') - Images: ' + r.image_count);
    });
  }
});

db.close();
