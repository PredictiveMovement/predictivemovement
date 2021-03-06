defmodule Booking do
  use GenServer
  use Vex.Struct
  require Logger
  alias Engine.ES
  @derive Jason.Encoder
  @rmq Application.get_env(:engine, Adapters.RMQ)

  defstruct [
    :id,
    :pickup,
    :delivery,
    :assigned_to,
    :events,
    :metadata,
    :size,
    :requires_transport_id
  ]

  def pickup_exists?(map) when not is_nil(map.pickup), do: true
  def pickup_exists?(_), do: false

  def delivery_exists?(map) when not is_nil(map.delivery), do: true
  def delivery_exists?(_), do: false

  validates([:pickup, :lat], number: [is: true, if: &Booking.pickup_exists?/1])
  validates([:pickup, :lon], number: [is: true, if: &Booking.pickup_exists?/1])
  validates([:delivery, :lat], number: [is: true, if: &Booking.delivery_exists?/1])
  validates([:delivery, :lon], number: [is: true, if: &Booking.delivery_exists?/1])

  validates([:size, :weight],
    by: [function: &is_integer/1, message: "must be an integer", allow_nil: true]
  )

  validates([:size, :measurements],
    by: [
      function: &Booking.valid_measurements/1,
      message: "must be a list of integers",
      allow_nil: true
    ],
    length: [is: 3, allow_nil: true]
  )

  def valid_measurements(measurements) when is_list(measurements),
    do: Enum.all?(measurements, &is_integer/1)

  def valid_measurements(_), do: false

  def publish(data, routing_key),
    do:
      @rmq.publish(
        data,
        Application.fetch_env!(:engine, :outgoing_booking_exchange),
        routing_key
      )

  def make(%{
        pickup: pickup,
        delivery: delivery,
        metadata: metadata,
        size: size,
        id: id
      }) do

    booking = %Booking{
      id: id,
      pickup: pickup,
      delivery: delivery,
      metadata: metadata |> Jason.encode!(),
      events: [],
      size: size
    }

    with true <- Vex.valid?(booking) do
      booking
      |> add_event_to_events_list("new", DateTime.utc_now())
      |> (fn booking ->
            ES.add_event(%BookingRegistered{booking: booking})

            booking
          end).()
      |> apply_booking_to_state()

      id
    else
      _ ->
        booking
        |> print_validation_errors()
        |> Vex.errors()
    end
  end

  def update(%{id: "pmb-" <> _ = id} = booking_update) do
    with true <- Vex.valid?(struct(Booking, booking_update)),
         true <- apply_update_to_state(booking_update) do
      id
    else
      e ->
        IO.inspect(e)

        IO.inspect(Vex.errors(struct(Booking, booking_update)), label: "booking validation errors")
    end
  end

  def print_validation_errors(booking) do
    error_string =
      booking
      |> Vex.errors()
      |> Enum.map(fn
        {:error, obj, _, msg} when is_list(obj) -> Enum.join(obj, ": ") <> " " <> msg
        {:error, obj, _, msg} when is_atom(obj) -> Atom.to_string(obj) <> " " <> msg
      end)
      |> Enum.join("\n")

    Logger.error("Booking validation errors:\n" <> error_string)

    booking
  end

  def apply_booking_to_state(
        %Booking{id: "pmb-" <> _ = id, pickup: pickup, delivery: delivery} = booking
      ) do
    GenServer.start_link(
      __MODULE__,
      booking,
      name: via_tuple(id)
    )

    booking
    |> Map.from_struct()
    |> Map.put(:route, Osrm.route(pickup, delivery))
    |> publish("new")

    Engine.BookingStore.put_booking(id)
    booking
  end

  def get("pmb-" <> _ = id), do: GenServer.call(via_tuple(id), :get)

  def delete("pmb-" <> _ = id) do
    ES.add_event(%BookingDeleted{id: id})
    apply_delete_to_state(id)
  end

  def apply_delete_to_state("pmb-" <> _ = id) do
    Engine.BookingStore.delete_booking(id)
    GenServer.stop(via_tuple(id))

    publish(id, "deleted")
  end

  def assign("pmb-" <> _ = booking_id, %{id: vehicle_id}) do
    timestamp = DateTime.utc_now()

    %BookingAssigned{
      booking_id: booking_id,
      vehicle_id: vehicle_id,
      timestamp: timestamp
    }
    |> ES.add_event()

    apply_assign_to_state(booking_id, vehicle_id, timestamp)
  end

  def apply_assign_to_state("pmb-" <> _ = booking_id, vehicle, timestamp) do
    GenServer.call(via_tuple(booking_id), {:assign, vehicle, timestamp})
    |> Map.from_struct()
    |> Map.take([:assigned_to, :events, :id])
    |> publish("assigned")
  end

  def apply_update_to_state(%{id: id} = booking_update) do
    GenServer.call(via_tuple(id), {:update, booking_update})
    publish(booking_update, "updated")
    true
  end

  def add_event("pmb-" <> _ = booking_id, status)
      when status in ["picked_up", "delivered", "delivery_failed"] do
    timestamp = DateTime.utc_now()

    status
    |> event_to_event_store_struct(booking_id, timestamp)
    |> ES.add_event()

    apply_event_to_state(booking_id, status, timestamp)
  end

  def apply_event_to_state("pmb-" <> _ = booking_id, status, timestamp) do
    GenServer.call(via_tuple(booking_id), {:add_event, status, timestamp})
    |> Map.from_struct()
    |> Map.take([:events, :id])
    |> publish(status)
  end

  ### Internal

  defp via_tuple(id) when is_integer(id), do: via_tuple(Integer.to_string(id))

  defp via_tuple(id) when is_binary(id), do: {:via, :gproc, {:n, :l, {:booking_id, id}}}

  def init(init_arg) do
    {:ok, init_arg}
  end

  def handle_call(:get, _from, state), do: {:reply, state, state}

  def handle_call({:assign, vehicle_id, timestamp}, _from, state) do
    updated_state =
      state
      |> Map.put(:assigned_to, %{
        id: vehicle_id
      })
      |> add_event_to_events_list("assigned", timestamp)

    Logger.debug("booking was assigned", updated_state)
    {:reply, updated_state, updated_state}
  end

  def handle_call({:add_event, status, timestamp}, _, state) do
    Logger.info("Received event #{status} for booking: #{state.id} ")

    updated_state =
      state
      |> add_event_to_events_list(status, timestamp)

    {:reply, updated_state, updated_state}
  end

  def handle_call({:update, updated_booking}, _from, state) do
    {:reply, true, Map.merge(state, updated_booking)}
  end

  defp add_event_to_events_list(booking, status, timestamp) do
    new_event = %{timestamp: timestamp, type: String.to_atom(status)}

    booking
    |> Map.update!(:events, fn events -> [new_event | events] end)
  end

  defp event_to_event_store_struct("picked_up", booking_id, timestamp),
    do: %BookingPickedUp{booking_id: booking_id, timestamp: timestamp}

  defp event_to_event_store_struct("delivered", booking_id, timestamp),
    do: %BookingDelivered{booking_id: booking_id, timestamp: timestamp}

  defp event_to_event_store_struct("delivery_failed", booking_id, timestamp),
    do: %BookingDeliveryFailed{booking_id: booking_id, timestamp: timestamp}
end
