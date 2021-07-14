defmodule Engine.TripProcessor do
  use Broadway
  require Logger

  def start_link(_opts) do
    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module:
          {BroadwayRabbitMQ.Producer,
           after_connect: fn _ -> Logger.info("#{__MODULE__} connected to rabbitmq") end,
           queue: "get_trip",
           declare: [durable: true],
           on_failure: :reject,
           metadata: [:amqp_channel, :correlation_id, :reply_to],
           connection: [
             host: Application.fetch_env!(:engine, :amqp_host)
           ]}
      ],
      processors: [
        default: [
          concurrency: 100
        ]
      ]
    )
  end

  def handle_message(
        _,
        %{
          metadata: %{
            amqp_channel: amqp_channel,
            correlation_id: correlation_id,
            reply_to: reply_to
          }
        } = message,
        _
      ) do
    plan = PlanStore.get_plan()

    AMQP.Basic.publish(amqp_channel, "", reply_to, Jason.encode!(plan),
      correlation_id: correlation_id
    )

    message
  end
end
