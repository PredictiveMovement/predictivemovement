const fetch = require('node-fetch')

const toGeocodeQuery = ({ lat, lon }) =>
  `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat}, ${lon}&key=${process.env.GOOGLE_API_TOKEN}`

const trimCountrySpec = (address) => {
  const [addressName, postalCode, _country] = address
    .split(',')
    .map((str) => str.trim())

  return `${addressName}, ${postalCode}`
}

const getAddressFromCoordinate = (coordinate) =>
  fetch(toGeocodeQuery(coordinate))
    .then((res) => res.json())
    .then(({ results }) => {
      if (!results.length)
        throw new Error('No results found for that coordinate')

      const [first] = results
      return trimCountrySpec(first.formatted_address)
    })
    .catch((err) =>
      console.log('Error getting google geocode data: ', err.message)
    )

module.exports = { getAddressFromCoordinate }