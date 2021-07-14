import { publishCalculateTrip } from './rabbitmqConnector'

const calculateTrip = () => publishCalculateTrip()

export { calculateTrip }
