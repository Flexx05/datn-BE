import axios from 'axios';

export const calculateShippingDistance = async (from, to) => {
  try {
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
      },
      {
        headers: {
          Authorization: process.env.ORS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const distanceInMeters = response.data.features[0].properties.summary.distance;
    return distanceInMeters;
  } catch (error) {
    console.error('Error calculating distance:', error.message);
    return null;
  }
};

export const calculateShippingFee = (distanceInMeters) => {
  const distanceInKm = distanceInMeters / 1000;
  return distanceInKm < 50 ? 40000 : 50000
};
