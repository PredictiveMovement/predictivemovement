defmodule MQ do
  def wait_for_messages(channel, correlation_id) do
    receive do
      {:basic_deliver, payload, %{correlation_id: ^correlation_id}} ->
        payload

      _ ->
        wait_for_messages(channel, correlation_id)
    end
  end

  def call(data, queue) do
    {:ok, connection} =
      AMQP.Connection.open("amqp://" <> Application.fetch_env!(:engine, :amqp_host))

    {:ok, channel} = AMQP.Channel.open(connection)

    {:ok, %{queue: queue_name}} =
      AMQP.Queue.declare(
        channel,
        "",
        exclusive: true
      )

    AMQP.Basic.consume(channel, queue_name, nil, no_ack: false)

    correlation_id =
      :erlang.unique_integer()
      |> :erlang.integer_to_binary()
      |> Base.encode64()

    request = Poison.encode!(data)

    AMQP.Basic.publish(
      channel,
      "",
      queue,
      request,
      reply_to: queue_name,
      correlation_id: correlation_id
    )

    wait_for_messages(channel, correlation_id)
  end

  ## TODO: @mikael- where should we place these?

  def publish(data, exchange_name) do
    {:ok, connection} =
      AMQP.Connection.open("amqp://" <> Application.fetch_env!(:engine, :amqp_host))

    {:ok, channel} = AMQP.Channel.open(connection)
    AMQP.Exchange.declare(channel, exchange_name, :fanout)

    AMQP.Basic.publish(channel, exchange_name, "", Poison.encode!(data),
      content_type: "application/json"
    )

    AMQP.Connection.close(connection)
    data
  end

  def publish(data, exchange_name, routing_key) do
    {:ok, connection} =
      AMQP.Connection.open("amqp://" <> Application.fetch_env!(:engine, :amqp_host))

    {:ok, channel} = AMQP.Channel.open(connection)

    AMQP.Exchange.declare(channel, exchange_name, :topic)

    AMQP.Basic.publish(channel, exchange_name, routing_key, Poison.encode!(data),
      content_type: "application/json"
    )

    AMQP.Connection.close(connection)

    data
  end

  def declare_queue(queue) do
    {:ok, connection} =
      AMQP.Connection.open("amqp://" <> Application.fetch_env!(:engine, :amqp_host))

    {:ok, channel} = AMQP.Channel.open(connection)
    AMQP.Queue.declare(channel, queue, durable: false)
  end
end