import fetch from 'node-fetch'
import polyline from 'polyline'
const osrmUrl = process.env.OSRM_URL|| "https://osrm.iteamdev.io"

export interface Position {
  lon: number
  lat: number
}

export interface Positions {
  from_lat: string
  from_lon: string
  to_lat: string
  to_lon: string
}

const getNearest = async({lon,lat}: Position) => 
  await fetch(`${osrmUrl}/nearest/v1/driving/${lon},${lat}`).then((res) => res.json())



const getRoute = async({from_lat, from_lon, to_lat, to_lon}: Positions) => {
  const coordinates = [[from_lon, from_lat], [to_lon, to_lat]].join(';')

  return await fetch(`${osrmUrl}/route/v1/driving/${coordinates}?steps=true&alternatives=true&overview=full&annotations=true`)
  .then((res) => res.json())
  .then(result => result.routes && result.routes.sort((a:any, b:any) => a.duration < b.duration)[0])
  .then(route => {
        if (!route) return {}
        route.geometry = { coordinates: decodePolyline(route.geometry) }
        return route
      })
}


function decodePolyline(geometry:any) {
    return polyline
      .decode(geometry)
      .map(point => ({
        lat: point[0],
        lon: point[1]
      }))
  
}




export { getNearest, getRoute } 