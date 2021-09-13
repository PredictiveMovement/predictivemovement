# Predictive Movement

[![Build Status](https://github.com/iteam1337/predictivemovement/workflows/Build%20&%20Deploy%20to%20Dev/badge.svg)](https://github.com/iteam1337/predictivemovement/actions)

This is the source code for the collaborative open source project Predictive Movement.

## About

Predictive Movement aims to create a digital platform that will act as a collaborative hub for the transports of people and goods with the help of artificial intelligence (AI). In its first phase, the project will solve the societal challenge of parcel deliveries in rural areas. Further on, the project aims to deal with optimizing availability and accessibility in areas ranging from urban to rural.

Predictive Movement is a project financed by, among others, Sweden’s Innovation Agency (Vinnova) and the Swedish Transport Administration. The project includes one Swedish region, four municipalities, a university, authorities as well as key actors within digitization and traffic/logistics. An important driving force behind the project is to combat climate change and to reduce emissions caused by road transports.

## Navigating the code

The source code for the project is contained in this mono-repo. Within the [packages](packages) folder you will find all included packages. Here is a summary of the components:

- [Engine](packages/engine_umbrella/apps/engine) The main logic written in Elixir
- [Driver interface](packages/driver-interface) Bot in Telegram for communicating with drivers
- [Booking interface](packages/booking-interface) Bot in Telegram for communicating with bookers of transport
- [Engine UI](packages/engine-ui) Main UI for visualising current bookings and cars
- [Engine Server](packages/engine-server) Node-server backend for Engine UI
- [Route Optimization Jsprit](packages/route-optimization-jsprit) A fork of [Jsprit](https://github.com/graphhopper/jsprit); used to help calculating the best vehicle to booking matches.
- [Vehicle Offer](packages/vehicle-offer) Re-routes vehicle offers to the queue
- [Auto Accept Offer](packages/auto-accept-offer) Auto accepts offers for vehicles created in the Engine UI
- [Booking-dispatcher](packages/booking-dispatcher) Auto accepts offers for vehicles created in the Engine UI
- [Signing UI](packages/signing-ui) UI for signing a package on delivery

## Running the project

#### Before you start running the project

Start by exporting port 9200

```
kubectl port-forward elasticsearch-0 9200:9200 --namespace pelias
```

### Running Predictive Movement locally

You will need the following API keys
POSTNORD_KEY - for engine-server
REACT_APP_MAPBOX_ACCESS_TOKEN - for engine-ui
GOOGLE_API_TOKEN - for driver-interface
TELEGRAM_BOT_TOKEN - for driver-interface

#### Set environment variables

create .env-file in packages/driver-interface/.env with

    GOOGLE_API_TOKEN=<FROM LASTPASS>
    BOT_TOKEN=<FROM LASTPASS> / or create your own bot in telegram

create .env-file in packages/engine-ui/.env with

    REACT_APP_MAPBOX_ACCESS_TOKEN=<FROM LASTPASS>

#### Start the services

    docker-compose up

#### Run migrations and start the engine

    cd packages/engine_umbrella/
    mix deps.get
    mix setup_dev
    iex -S mix

#### Running tests

Make sure you've started the dependencies with docker-compose up -d then run

    cd packages/engine_umbrella/
    mix deps.get
    mix setupTestDatabase
    mix test

### Helper/utility functions for populating the state

The umbrella project has an application "message_generator" which is used to create rabbitMQ messages for producing transports and bookings. First start the umbrella project in an elixir shell

    cd packages/engine_umbrella/
    iex -S mix

Then the Generator module is available inside the shell.

    add_booking/0      add_booking/1      add_transport/0    add_transport/1

The argument can be a map containing properties or an atom for creating a generic one close to a city, (`:stockholm`, `:gothenburg`, `:ljusdal`)
or in the case of the add_transport; a keyword list can also be used containing `:phone`, i.e: `Generator.add_transport(phone: "0735333")`

**Design mockup:** [Figma](https://www.figma.com/file/DdBjpoKd0T9OkWmhlpd48Nfa/Predictive-Movement)


### Infrastructure

The documentation about our cloud infrastructure and tools used is available [here](./infra/README.md)

---

## Vocabulary

```
Transport (previously vehicle){
    id
    busy
    activities
    booking_ids
    metadata
    start_address
    end_address
    earliest_start
    latest_end
    profile
    capacity
}
```

```
Booking {
    id
    pickup
    delivery
    assigned_to
    external_id
    events
    metadata
    size
    requires_transport_id
}
```

Plan

Route

## License

Predictive Movement is licensed under the MIT license. Please see [LICENSE.md](LICENSE.md) for details.
