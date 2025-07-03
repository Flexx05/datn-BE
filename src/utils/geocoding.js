// services/geocoding.service.js
import axios from 'axios';

export const geocodeAddress = async (address) => {
  try {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
      address
    )}&key=${process.env.GEOCODING_API_KEY}&language=vi&limit=1`;

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
