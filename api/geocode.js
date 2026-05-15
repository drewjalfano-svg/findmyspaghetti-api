export default async function handler(req, res) {
  const allowed = [
    'https://findmyspaghetti.com',
    'https://www.findmyspaghetti.com',
    'https://find-my-spaghetti.webflow.io'
  ];
  const origin = req.headers.origin;
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing q' });
  }

  const key = process.env.GOOGLE_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Server missing API key' });
  }

  const url = 'https://maps.googleapis.com/maps/api/geocode/json'
    + '?address=' + encodeURIComponent(q)
    + '&key=' + key;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'Google error', detail: text });
    }
    const data = await response.json();
    if (data.status !== 'OK' || !data.results || !data.results[0]) {
      return res.status(404).json({ error: 'Location not found', status: data.status });
    }
    const loc = data.results[0].geometry.location;
    return res.status(200).json({
      lat: loc.lat,
      lng: loc.lng,
      formatted: data.results[0].formatted_address
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server crashed', detail: String(err) });
  }
}
