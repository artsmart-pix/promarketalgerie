const express = require('express');
const router = express.Router();
const { searchExa, searchAndGetContents } = require('../services/exa');

/**
 * POST /api/exa/search
 * Exemple de recherche sémantique avec Exa AI
 */
router.post('/search', async (req, res) => {
  try {
    const { query, numResults = 5, type = 'neural' } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Paramètre "query" requis' });
    }

    const results = await searchExa(query, { numResults, type });
    res.json({
      success: true,
      query,
      results: results.results || []
    });
  } catch (err) {
    console.error('Exa search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/exa/search-with-contents
 * Recherche + récupération du contenu détaillé
 */
router.post('/search-with-contents', async (req, res) => {
  try {
    const { query, numResults = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Paramètre "query" requis' });
    }

    const { searchResults, contents } = await searchAndGetContents(query, {
      numResults,
      useAutoprompt: true
    }, {
      text: true,
      highlights: { numSentences: 2, highlightsPerUrl: 1 }
    });

    res.json({
      success: true,
      query,
      results: searchResults.results || [],
      contents: contents?.results || []
    });
  } catch (err) {
    console.error('Exa search+contents error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/exa/example
 * Exemple prêt à l'emploi
 */
router.get('/example', async (req, res) => {
  try {
    const query = req.query.q || 'meilleurs équipements BTP Algérie 2024';
    
    const results = await searchExa(query, {
      numResults: 5,
      includeDomains: ['dz', 'com', 'org'],
      useAutoprompt: true
    });

    res.json({
      success: true,
      message: 'Exemple de recherche Exa AI',
      query,
      totalResults: results.results?.length || 0,
      results: results.results || []
    });
  } catch (err) {
    console.error('Exa example error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
