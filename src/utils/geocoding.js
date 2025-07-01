// services/geocoding.service.js
import axios from 'axios';

const GEOCODING_API_KEY = 'ae032e6f4d9d4a89abdc53251c45a563';

export const geocodeAddress = async (address) => {
  try {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
      address
    )}&key=${GEOCODING_API_KEY}&language=vi&limit=1`;

    const response = await axios.get(url);
    const data = response.data;

    if (data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry;
      return { lat, lng };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
};
