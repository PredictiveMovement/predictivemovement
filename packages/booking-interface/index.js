require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const bot = require('./bot')
const { bookingWizard } = require('./bookingWizard')
const botCommands = require('./botCommands')
const session = require('telegraf/session')
const amqp = require('./amqp')
const Stage = require('telegraf/stage')

bot.start((ctx) => {
  const {
    first_name,

    last_name,

    id,
  } = ctx.update.message.from

  ctx.reply(`Välkommen ${first_name} ${last_name}! :) Ditt id är ${id}`)
})

bot.use(session())

const stage = new Stage([bookingWizard])

bot.use(stage.middleware())

botCommands.registerHandlers(bot)

// amqp
//   .init()
//   .then(() => amqp.subscribe(amqp.queues.DELIVERY_REQUESTS, console.log))
//   .then(() => amqp.rpcServer())

bot.launch()

const app = express()
  .use(cors())
  .use(bodyParser.json())
  .use(
    bodyParser.urlencoded({
      extended: true,
    })
  )

const server = require('http').Server(app)
const port = process.env.PORT || 5000
server.listen(port, console.log(`listening on ${port}`))
