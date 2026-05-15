export default async function handler(req, res) {
  // Allow your site to call this from the browser
  res.setHeader('Access-Control-Allow-Origin', 'https://findmyspaghetti.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing lat or lng' });
  }

  const key = process.env.FSQ_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Server missing API key' });
  }

  const url = 'https://api.foursquare.com/v3/places/search'
    + '?ll=' + lat + ',' + lng
    + '&categories=13236,13064,13065,13302'
    + '&fields=fsq_id,name,location,categories,distance,rating,price,photos,stats'
    + '&sort=DISTANCE'
    + '&limit=20';

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': key, 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'Foursquare error', detail: text });
    }

    const data = await response.json();
    const spots = (data.results || []).map(function(p) {
      const photo = (p.photos && p.photos[0])
        ? p.photos[0].prefix + '300x200' + p.photos[0].suffix
        : '';
      return {
        id: p.fsq_id,
        name: p.name,
        lat: p.geocodes && p.geocodes.main ? p.geocodes.main.latitude : (p.location && p.location.lat),
        lng: p.geocodes && p.geocodes.main ? p.geocodes.main.longitude : (p.location && p.location.lng),
        address: (p.location && p.location.formatted_address) || '',
        rating: p.rating || null,
        reviews: (p.stats && p.stats.total_ratings) || 0,
        price: p.price ? '$'.repeat(p.price) : '$$',
        category: p.categories && p.categories[0] ? p.categories[0].name : 'Restaurant',
        photo: photo,
        distance: p.distance || null
      };
    });

    return res.status(200).json({ spots: spots });
  } catch (err) {
    return res.status(500).json({ error: 'Server crashed', detail: String(err) });
  }
}
