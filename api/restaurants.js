export default async function handler(req, res) {
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

  const url = 'https://places-api.foursquare.com/places/search'
    + '?ll=' + lat + ',' + lng
    + '&fsq_category_ids=4d4b7105d754a06374d81259'
    + '&fields=fsq_place_id,name,location,categories,distance,rating,price,photos,stats,latitude,longitude'
    + '&sort=DISTANCE'
    + '&limit=20';

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + key,
        'Accept': 'application/json',
        'X-Places-Api-Version': '2025-06-17'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'Foursquare error', status: response.status, detail: text });
    }

    const data = await response.json();
    const spots = (data.results || []).map(function(p) {
      const photo = (p.photos && p.photos[0])
        ? p.photos[0].prefix + '300x200' + p.photos[0].suffix
        : '';
      return {
        id: p.fsq_place_id,
        name: p.name,
        lat: p.latitude || (p.location && p.location.lat),
        lng: p.longitude || (p.location && p.location.lng),
        address: (p.location && (p.location.formatted_address || p.location.address)) || '',
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
