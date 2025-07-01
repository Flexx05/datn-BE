import axios from 'axios';

const ORS_API_KEY = '5b3ce3597851110001cf624804785dcf7c164a3f93df2514d6d75242'; 

export const calculateShippingDistance = async (from, to) => {
  try {
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        coordinates: [
          [from.lng, from.lat], // phải là [lng, lat]
          [to.lng, to.lat],
        ],
      },
      {
        headers: {
          Authorization: ORS_API_KEY,
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
  const feePerKm = 3000; // giá mỗi km
  const distanceInKm = distanceInMeters / 1000; // chuyển đơn vị m -> km
  return Math.round(distanceInKm * feePerKm);
};
