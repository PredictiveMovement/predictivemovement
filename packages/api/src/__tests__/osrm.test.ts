import { getRoute } from '../osrm/engineAdapter'
import nock from 'nock'

const osrmUrl = process.env.OSRM_URL|| "https://osrm.iteamdev.io"

import { decode } from 'polyline'
jest.mock('polyline')

describe('osrm', () => {
  describe('#getRoute()', () => {
    it('get route ...', async () => {
      const scope = nock(osrmUrl)
        .get(/\/route\/v1\/driving\/\S*/)
        .reply(200, {
          routes: [{
            geometry: {
              "coordinates": [
                {
                  "lat": 56.94274,
                  "lon": 18.31072
                },
                {
                  "lat": 56.94274,
                  "lon": 18.31072
                }
              ]
            }
          }]
        })
        
        ;(decode as jest.Mock).mockReturnValue([13, 37])

        const positions = {from_lat: '11.9795635', from_lon: '57.7027127', to_lat: '12.067781', to_lon: '57.753753' }
        const result = await getRoute(positions)

        expect(decode).toBeCalledWith({"coordinates": [{"lat": 56.94274, "lon": 18.31072}, {"lat": 56.94274, "lon": 18.31072}]})
    })
  })
  it('get route does nothing if routes is missing', async () => {
    const scope = nock(osrmUrl)
      .get(/\/route\/v1\/driving\/\S*/)
      .reply(200, {})
      
      const positions = {from_lat: '11.9795635', from_lon: '57.7027127', to_lat: '12.067781', to_lon: '57.753753' }
      const result = await getRoute(positions)

      expect(result).toEqual({})
  })
})
