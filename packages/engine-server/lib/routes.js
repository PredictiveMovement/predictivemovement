const _ = require('highland')
const engine = require('@iteam1337/engine')

const carsCache = new Map()
const movingCarsCache = new Map()
const bookingsCache = new Map()

const bookings = engine.possibleRoutes
  .fork()
  .map(pr => pr.booking)
  .errors(err => console.error(err))

const cars = engine.possibleRoutes
  .fork()
  .flatMap(pr => pr.closestCars)
  .errors(err => console.error(err))

// const movingCars = engine.cars.fork().errors(err => console.error(err))

// engine.cars.fork().each(car => console.log('car', car.id))
// engine.bookings.fork().each(booking => console.log('booking', booking.id))

function register(io) {
  io.on('connection', function(socket) {
    _.merge([_(carsCache.values()), cars.fork()])
      .filter(car => car.car.id)
      .doto(car => {
        carsCache.set(car.car.id, car)
      })
      .map(({ car, detour }) => ({ ...car, detour }))
      .pick([
        'position',
        'status',
        'id',
        'tail',
        'zone',
        'speed',
        'bearing',
        'detour',
        'heading',
      ])
      .batchWithTimeOrCount(1000, 2000)
      .errors(console.error)
      .each(cars => socket.volatile.emit('cars', cars))

    _.merge([_(bookingsCache.values()), bookings.fork()])
      .doto(booking => bookingsCache.set(booking.id, booking))
      .batchWithTimeOrCount(1000, 5)
      .errors(console.error)
      .each(bookings => socket.emit('bookings', bookings))

    _.merge([_(movingCarsCache.values()), engine.cars.fork()])
      .filter(car => car.id)
      .doto(car => {
        movingCarsCache.set(car.id, car)
      })
      .pick([
        'position',
        'status',
        'id',
        'tail',
        'zone',
        'speed',
        'bearing',
        'heading',
      ])
      .batchWithTimeOrCount(1000, 2000)
      .errors(console.error)
      .each(cars => socket.volatile.emit('moving-cars', cars))
  })
}

module.exports = {
  register,
}
