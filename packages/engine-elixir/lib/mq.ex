defmodule MQ do
  def publish(queue, data) do
    {:ok, connection} = AMQP.Connection.open(Application.fetch_env!(:engine, :amqp_host))
    {:ok, channel} = AMQP.Channel.open(connection)
    AMQP.Queue.declare(channel, queue)
    AMQP.Basic.publish(channel, "", queue, Poison.encode!(data), content_type: "application/json")
    AMQP.Connection.close(connection)
  end

  # def publishExchange(exchange, data) do
  #   {:ok, connection} = AMQP.Connection.open(Application.fetch_env!(:engine, :amqp_host))
  #   {:ok, channel} = AMQP.Channel.open(connection)
  #   AMQP.Exchange.declare(channel, exchange, :fanout)
  #   AMQP.Basic.publish(channel, exchange, "", Poison.encode!(data), content_type: "application/json")
  #   AMQP.Connection.close(connection)
  # end

  # THIS DOES NOT WORK PROPERLY, USE AT OWN RISK
  # def subscribe(queue) do
  #   {:ok, connection} = AMQP.Connection.open()
  #   {:ok, channel} = AMQP.Channel.open(connection)
  #   AMQP.Queue.declare(channel, queue)

  #   AMQP.Basic.consume(
  #     channel,
  #     queue,
  #     nil
  #   )
  # end
end