import { operations, components } from '../__generated__/schema'
import { nanoid } from 'nanoid'
import fetch from 'node-fetch'
import polyline from 'polyline'
const osrmUrl = process.env.OSRM_URL|| "https://osrm.iteamdev.io"

export interface Position {
  lon: number
  lat: number
}

export interface Positions {
from: {
    lon: number
    lat: number
  },
  to: {
    lon: number
    lat: number
  }
}

const getNearest = async({lon,lat}: Position) => 
  await fetch(`${osrmUrl}/nearest/v1/driving/${lon},${lat}`).then((res) => res.json())



const getRoute = async({from, to}: Positions) => {
  const coordinates = [[from.lon, from.lat], [to.lon, to.lat]].join(';')
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




export { getNearest, getRoute, decodePolyline } 