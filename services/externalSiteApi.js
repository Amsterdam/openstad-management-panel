const fetch = require('node-fetch');
const apiUrl =
  process.env.EXTERNAL_SITE_REPO || process.env.API_URL
    ? `${process.env.API_URL}/api/repo`
    : undefined || 'https://api.openstad.amsterdam.nl/api/repo';
const siteApiKey = process.env.SITE_API_KEY;

exports.fetchAll = async () => {
  try {
    let response = await fetch(`${apiUrl}`, {
      headers: { 'Content-type': 'application/json' },
      method: 'GET',
    });
    if (!response.ok) {
      console.log(response);
      throw new Error('Fetch failed');
    }
    return await response.json();
  } catch (err) {
    console.log(err);
  }
};
