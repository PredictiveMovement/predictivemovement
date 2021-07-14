import { amqp } from '../amqp/connector'

const publishCalculateTrip = () => {
  return amqp
    .queue('calculate_trip', {
      durable: true,
    })
    .publish('')
    .then(() => console.log(`[x] Calculate trip`))
}

export { publishCalculateTrip }
