const GOOGLE_PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places';
const FIELD_MASK = [
  'id',
  'displayName',
  'rating',
  'userRatingCount',
  'googleMapsUri',
  'reviews.rating',
  'reviews.text',
  'reviews.authorAttribution',
  'reviews.relativePublishTimeDescription',
  'reviews.publishTime',
  'reviews.googleMapsUri',
].join(',');

const cache = {
  data: null,
  expiresAt: 0,
};
const CACHE_MAX_AGE_SECONDS = 24 * 60 * 60;

function cleanText(value, maxLength) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trim()}...`;
}

function normaliseReview(review) {
  const author = review.authorAttribution || {};
  return {
    authorName: cleanText(author.displayName, 80) || 'Google reviewer',
    authorUri: author.uri || '',
    authorPhotoUri: author.photoUri || '',
    rating: Number(review.rating) || 0,
    text: cleanText(review.text && review.text.text, 260),
    relativePublishTimeDescription: cleanText(review.relativePublishTimeDescription, 40),
    publishTime: review.publishTime || '',
    googleMapsUri: review.googleMapsUri || '',
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return res.status(204).end();
  }

  if (cache.data && cache.expiresAt > Date.now()) {
    res.setHeader('Cache-Control', `public, s-maxage=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=86400`);
    return res.status(200).json(cache.data);
  }

  const placeResource = placeId.startsWith('places/') ? placeId : `places/${placeId}`;
  const url = `${GOOGLE_PLACES_ENDPOINT}/${encodeURIComponent(placeResource).replace('%2F', '/')}?languageCode=en-AU&regionCode=AU`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
    });

    const place = await response.json();

    if (!response.ok) {
      console.error('Google Places request failed:', place);
      return res.status(502).json({ error: 'Google reviews are unavailable right now.' });
    }

    const reviews = Array.isArray(place.reviews)
      ? place.reviews
          .map(normaliseReview)
          .filter((review) => review.rating > 0 && review.text)
          .slice(0, 3)
      : [];

    const data = {
      placeName: place.displayName && place.displayName.text ? cleanText(place.displayName.text, 100) : 'ProBall',
      rating: Number(place.rating) || 0,
      userRatingCount: Number(place.userRatingCount) || 0,
      googleMapsUri: place.googleMapsUri || '',
      reviews,
      fetchedAt: new Date().toISOString(),
    };

    cache.data = data;
    cache.expiresAt = Date.now() + CACHE_MAX_AGE_SECONDS * 1000;

    res.setHeader('Cache-Control', `public, s-maxage=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=86400`);
    return res.status(200).json(data);
  } catch (err) {
    console.error('Google reviews endpoint failed:', err);
    return res.status(502).json({ error: 'Google reviews are unavailable right now.' });
  }
};
