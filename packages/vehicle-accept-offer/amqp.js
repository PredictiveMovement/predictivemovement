const open = require('amqplib').connect(
  process.env.AMQP_HOST || 'amqp://localhost'
)

const exchanges = {}

const queues = {
  PICKUP_OFFERS: 'pickup_offers'
}

module.exports = {
  open,
  queues,
  exchanges,
}