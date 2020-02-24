defmodule CarFinder do
  def rad(x) do
    x * Math.pi() / 180
  end

  @doc """
  Calculate birds distance between two coordinates
  """
  def haversine(p1, p2) do
    radius = 6_371_000

    dLat = rad(p2.lat - p1.lat)
    dLong = rad(p2.lon - p1.lon)

    a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) * Math.sin(dLong / 2) *
          Math.sin(dLong / 2)

    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    d = radius * c

    Kernel.round(d)
  end

  @doc """

  Calculate birds distance (haversine) from a cars current position to a booking
  """
  def distance(car, booking) do
    distance = haversine(Car.position(car), booking.departure)
    %{car: car, distance: distance}
  end

  @doc """
  Sort all cars in a list according to birds distance to a booking
  """
  def closestCars(booking, cars) do
    cars
    |> Enum.map(fn car -> distance(car, booking) end)
    |> Enum.sort(fn a, b -> a.distance < b.distance end)
    |> Enum.map(fn car -> car.car end)
  end

  @doc """
  Sort all cars in a list based on the smallest calculated detour from the cars original route
  """
  def detourCars(cars, booking) do
    cars
    |> Enum.map(fn car ->
      Osrm.trip([
        car.position,
        booking.departure,
        booking.destination,
        car.heading
      ])

      |> (fn %{code: "Ok", trips: [detour | _rest]} ->
            %{
              car: car,
              detour: detour
            }
          end).()
    end)
    |> Enum.map(fn %{car: car, detour: detour} ->
      %{
        car: car,
        detour: Map.put(detour, :diff, detour.distance - car.route.distance)
      }
    end)
    |> Enum.sort(fn a, b -> a.detour.diff < b.detour.diff end)
  end

  @doc """
  find the best suitable cars for a booking
  """
  def find(booking, cars) do
    closestCars(booking, cars)
    |> detourCars(booking)
    |> Enum.take(2)
  end
end
