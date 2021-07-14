defmodule Engine.PlanRequestProcessor do
  use Broadway
  require Logger

  def start_link(_opts) do
    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module:
          {BroadwayRabbitMQ.Producer,
           after_connect: fn _ -> Logger.info("#{__MODULE__} connected to rabbitmq") end,
           queue: "calculate_trip",
           declare: [durable: true],
           on_failure: :reject,
           connection: [
             host: Application.fetch_env!(:engine, :amqp_host)
           ]}
      ],
      processors: [
        default: [
          concurrency: 1
        ]
      ]
    )
  end

  def handle_message(_, message, _) do
    booking_ids = Engine.BookingStore.get_bookings()
    vehicle_ids = Engine.VehicleStore.get_vehicles()

    Plan.calculate(vehicle_ids, booking_ids)
    message
  end
end
