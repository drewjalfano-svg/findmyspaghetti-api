export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing lat or lng' });
  }

  const key = process.env.GOOGLE_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Server missing API key' });
  }

  const url = 'https://places.googleapis.com/v1/places:searchNearby';
  const body = {
    includedTypes: ['italian_restaurant'],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        radius: 5000
      }
    },
    rankPreference: 'DISTANCE'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.primaryTypeDisplayName,places.editorialSummary'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'Google error', status: response.status, detail: text });
    }

    const data = await response.json();
    const priceMap = {
      'PRICE_LEVEL_FREE': '$',
      'PRICE_LEVEL_INEXPENSIVE': '$',
      'PRICE_LEVEL_MODERATE': '$$',
      'PRICE_LEVEL_EXPENSIVE': '$$$',
      'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
    };

    const spots = (data.places || []).map(function(p) {
      let photo = '';
      if (p.photos && p.photos[0] && p.photos[0].name) {
        photo = 'https://places.googleapis.com/v1/' + p.photos[0].name + '/media?maxWidthPx=400&key=' + key;
      }
      return {
        id: p.id,
        name: (p.displayName && p.displayName.text) || 'Restaurant',
        lat: p.location && p.location.latitude,
        lng: p.location && p.location.longitude,
        address: p.formattedAddress || '',
        rating: p.rating || null,
        reviews: p.userRatingCount || 0,
        price: priceMap[p.priceLevel] || '$$',
        category: (p.primaryTypeDisplayName && p.primaryTypeDisplayName.text) || 'Italian',
        photo: photo,
        summary: (p.editorialSummary && p.editorialSummary.text) || ''
      };
    });

    return res.status(200).json({ spots: spots });
  } catch (err) {
    return res.status(500).json({ error: 'Server crashed', detail: String(err) });
  }
}
