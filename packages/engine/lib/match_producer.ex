defmodule Engine.MatchProducer do
  use GenStage
  alias Broadway.Message

  @vehicles_exchange "cars"
  @bookings_exchange "bookings"

  @available_vehicles_queue_name "routes"
  @available_bookings_queue_name "booking_requests"

  def start_link() do
    GenStage.start_link(Engine.MatchProducer, %{})
  end

  def init(_) do
    create_rmq_resources()
    {:producer, %{vehicles: [], bookings: []}}
  end

  ## Select events -> dispatch

  def handle_info({:basic_consume_ok, _}, state) do
    {:noreply, [], state}
  end

  def handle_info({:basic_deliver, vehicle, %{exchange: @vehicles_exchange}}, %{
        vehicles: vehicles,
        bookings: bookings
      }) do
    IO.puts("new vehicle!")

    vehicle = string_to_vehicle_transform(vehicle)

    dispatch_events([vehicle | vehicles], bookings)
  end

  def handle_info(
        {:basic_deliver, booking, %{exchange: @bookings_exchange, routing_key: "new"}},
        %{
          vehicles: vehicles,
          bookings: bookings
        }
      ) do
    IO.puts("new booking!")
    booking = string_to_booking_transform(booking)
    dispatch_events(vehicles, [booking | bookings])
  end

  ## send messages to broadway and update state

  def dispatch_events(vehicles, [] = _bookings),
    do: {:noreply, [], %{bookings: [], vehicles: vehicles}}

  def dispatch_events(vehicles, bookings) when length(vehicles) < 1,
    do: {:noreply, [], %{bookings: bookings, vehicles: vehicles}}

  def dispatch_events(vehicles, bookings) do
    message = %Message{
      data: {vehicles, bookings},
      acknowledger: {__MODULE__, :ack_id, :ack_data}
    }

    # pick out the message and return the state we want to keep
    {:noreply, [message], %{bookings: bookings, vehicles: vehicles}}
  end

  ## handle backpressure

  def handle_demand(_demand, state) do
    {:noreply, [], state}
  end

  def ack(_ack_ref, _successful, _failed) do
    :ok
  end

  ## helpers

  def string_to_vehicle_transform(vehicle_string) do
    %{position: position, id: external_id} = vehicle_string |> Poison.decode!(keys: :atoms!)
    Vehicle.make(external_id, position)
  end

  def string_to_booking_transform(booking_string) do
    %{pickup: pickup, delivery: delivery, id: id, senderId: senderId} =
      Poison.decode!(booking_string, keys: :atoms)

    Booking.make(pickup, delivery, id, senderId)
  end

  ## set up queues

  defp create_rmq_resources do
    # Setup RabbitMQ connection
    {:ok, connection} =
      AMQP.Connection.open("amqp://" <> Application.fetch_env!(:engine, :amqp_host))

    {:ok, channel} = AMQP.Channel.open(connection)

    # Create exchange
    AMQP.Exchange.fanout(channel, @vehicles_exchange, durable: false)
    AMQP.Exchange.declare(channel, @bookings_exchange, :topic, durable: false)

    # Create queues
    AMQP.Queue.declare(channel, @available_vehicles_queue_name, durable: false)
    AMQP.Queue.declare(channel, @available_bookings_queue_name, durable: false)

    # Bind queues to exchange
    AMQP.Queue.bind(channel, @available_vehicles_queue_name, @vehicles_exchange,
      routing_key: @available_vehicles_queue_name
    )

    AMQP.Queue.bind(channel, @available_bookings_queue_name, @bookings_exchange,
      routing_key: "new"
    )

    AMQP.Basic.consume(channel, @available_vehicles_queue_name, nil, no_ack: true)
    AMQP.Basic.consume(channel, @available_bookings_queue_name, nil, no_ack: true)
  end
end