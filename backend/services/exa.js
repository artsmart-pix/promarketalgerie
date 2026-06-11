const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_BASE_URL = 'https://api.exa.ai';

/**
 * Recherche sémantique avec Exa AI
 * @param {string} query - Requête de recherche
 * @param {Object} options - Options de recherche
 * @returns {Promise<Object>} Résultats de recherche
 */
async function searchExa(query, options = {}) {
  if (!EXA_API_KEY) {
    throw new Error('EXA_API_KEY non configuré dans les variables d\'environnement');
  }

  const payload = {
    query,
    numResults: options.numResults || 10,
    includeDomains: options.includeDomains || [],
    excludeDomains: options.excludeDomains || [],
    startCrawlDate: options.startCrawlDate,
    endCrawlDate: options.endCrawlDate,
    startPublishedDate: options.startPublishedDate,
    endPublishedDate: options.endPublishedDate,
    useAutoprompt: options.useAutoprompt ?? true,
    type: options.type || 'neural' // 'neural' | 'keyword' | 'auto'
  };

  const response = await fetch(`${EXA_BASE_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': EXA_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Exa API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Récupère le contenu détaillé des résultats
 * @param {Array<string>} ids - IDs des résultats Exa
 * @param {Object} options - Options de récupération
 */
async function getContents(ids, options = {}) {
  if (!EXA_API_KEY) {
    throw new Error('EXA_API_KEY non configuré');
  }

  const payload = {
    ids,
    text: options.text ?? true,
    highlights: options.highlights || {
      numSentences: 3,
      highlightsPerUrl: 1
    }
  };

  const response = await fetch(`${EXA_BASE_URL}/contents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': EXA_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Exa API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Recherche et récupère le contenu en une seule passe
 * @param {string} query - Requête de recherche
 * @param {Object} searchOpts - Options de recherche
 * @param {Object} contentOpts - Options de contenu
 */
async function searchAndGetContents(query, searchOpts = {}, contentOpts = {}) {
  const searchResults = await searchExa(query, searchOpts);
  
  if (!searchResults.results || searchResults.results.length === 0) {
    return { searchResults, contents: null };
  }

  const ids = searchResults.results.map(r => r.id);
  const contents = await getContents(ids, contentOpts);

  return { searchResults, contents };
}

module.exports = {
  searchExa,
  getContents,
  searchAndGetContents
};
