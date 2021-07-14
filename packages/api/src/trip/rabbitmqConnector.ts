import { amqp } from '../amqp/connector'
import { nanoid } from 'nanoid'
import EventEmitter from 'events'
const CALCULATE_TRIP_QUEUE = 'calculate_trip'
const GET_TRIP_QUEUE = 'get_trip'
const GET_TRIP_REPLY_QUEUE = 'get_trip_reply'
const emitter = new EventEmitter()

interface Activity {
  address: {
    lat: number
    lon: number
  }
  distance: number
  duration: number
  id?: string
  index: number
  type: string
}

export interface Trip {
  booking_ids: string[]
  excluded_booking_ids: string[]
  transports: [
    {
      activities: Activity[]
      booking_ids: string[]
      capacity: {
        volume: number
        weight: number
      }
      earliest_start: string
      end_address: {
        lat: number
        lon: number
      }
      id: string
      latest_end: string
      start_address: {
        lat: number
        lon: number
      }
    }
  ]
}

const publishCalculateTrip = () => {
  return amqp
    .queue(CALCULATE_TRIP_QUEUE, {
      durable: true,
    })
    .publish('')
    .then(() => console.log(`[x] Calculate trip`))
}

const getTrip = (): Promise<Trip> => {
  return new Promise((resolve) => {
    const correlationId = nanoid(8)
    const replyTo = GET_TRIP_REPLY_QUEUE

    amqp
      .queue(GET_TRIP_QUEUE, {
        durable: true,
      })
      .publish('', { correlationId, replyTo })

    emitter.once(correlationId, (trip: Trip) => {
      resolve(trip)
    })
  })
}

amqp
  .queue(GET_TRIP_REPLY_QUEUE, {
    durable: true,
  })
  .subscribe({ noAck: true })
  .map((res: any) => {
    const correlationId = res.properties.correlationId
    return [correlationId, res.json()]
  })
  .each(([correlationId, trip]: [string, Object]) => {
    emitter.emit(correlationId, trip)
  })

export { publishCalculateTrip, getTrip }
