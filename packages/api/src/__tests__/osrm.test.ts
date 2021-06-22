import { getNearest, getRoute } from '../osrm/engineAdapter'


describe('osrm', () => {
  xdescribe('#getNearest()', () => {
    it('get nearest position', async () => {
        const position ={lat: 31.337, lon: 69.69 }
        const result = await getNearest(position)

        // {
        //     waypoints: [
        //       {
        //         nodes: [Array],
        //         location: [Array],
        //         name: '',
        //         distance: 4995458.421728,
        //         hint: 'vPUKgMz1CoAQAAAAAAAAAJwAAAAAAAAAEdfDQQAAAABW3XFDAAAAABAAAAAAAAAAnAAAAAAAAACCAQAApbcYAaisZQOQYicEKCreAQUALwrXDdqG'
        //       }
        //     ],
        //     code: 'Ok'
        //   }

        expect(result.waypoints).toBeDefined
    })
  })

  describe('#getRoute()', () => {
    it('get nearest position', async () => {
        const positions ={from: {lat: 11.9795635, lon: 57.7027127}, to:{lat: 12.067781, lon: 57.753753 }  }
        const result = await getRoute(positions)

        expect(result).toBe(positions)
    })
  })

  
})
