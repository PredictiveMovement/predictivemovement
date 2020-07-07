package com.predictivemovement.route.optimization;

import java.util.ArrayList;
import java.util.List;

import com.graphhopper.jsprit.core.problem.Location;
import com.graphhopper.jsprit.core.problem.job.Shipment;
import com.graphhopper.jsprit.core.problem.vehicle.VehicleImpl;
import com.graphhopper.jsprit.core.problem.vehicle.VehicleType;
import com.graphhopper.jsprit.core.problem.vehicle.VehicleTypeImpl;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * This class sets the vehicles, vehicle types and shipments for the VRP.
 */
public class VRPSetting {

    private static final int WEIGHT_INDEX = 0;

    private static VehicleType vehicleDummyType;
    static {
        VehicleTypeImpl.Builder vehicleTypeBuilder = VehicleTypeImpl.Builder.newInstance("vehicleDummyType");
        vehicleTypeBuilder.addCapacityDimension(WEIGHT_INDEX, 3);
        vehicleTypeBuilder.setCostPerDistance(1);

        vehicleDummyType = vehicleTypeBuilder.build();
    }

    List<VehicleImpl> vehicles;
    List<Shipment> shipments;

    private JSONObject routeRequest;

    VRPSetting(JSONObject routeRequest) {
        this.routeRequest = routeRequest;
    }

    VRPSetting set() {
        createVehicles();
        createShipments();
        return this;
    }

    private void createVehicles() {
        vehicles = new ArrayList<>();

        JSONArray jsonVehicles = routeRequest.getJSONArray("vehicles");
        for (Object jsonVehicleObj : jsonVehicles) {
            JSONObject jsonVehicle = (JSONObject) jsonVehicleObj;

            // id
            String vehicleId = jsonVehicle.getString("id");
            VehicleImpl.Builder vehicleBuilder = VehicleImpl.Builder.newInstance(vehicleId);

            // type
            vehicleBuilder.setType(vehicleDummyType);

            // position
            JSONObject jsonPosition = jsonVehicle.getJSONObject("position");
            Location vehicleLocation = getLocation(jsonPosition);
            vehicleBuilder.setStartLocation(vehicleLocation);

            VehicleImpl vehicle = vehicleBuilder.build();
            vehicles.add(vehicle);
        }
    }

    private void createShipments() {
        shipments = new ArrayList<>();

        JSONArray jsonBookings = routeRequest.getJSONArray("bookings");
        for (Object jsonBookingObj : jsonBookings) {
            JSONObject jsonBooking = (JSONObject) jsonBookingObj;

            // id
            String shipmentId = jsonBooking.getString("id");
            Shipment.Builder shipmentBuilder = Shipment.Builder.newInstance(shipmentId);

            // pickup
            JSONObject jsonPickup = jsonBooking.getJSONObject("pickup");
            Location pickupLocation = getLocation(jsonPickup);
            shipmentBuilder.setPickupLocation(pickupLocation);

            // delivery
            JSONObject jsonDelivery = jsonBooking.getJSONObject("delivery");
            Location deliveryLocation = getLocation(jsonDelivery);
            shipmentBuilder.setDeliveryLocation(deliveryLocation);

            // package capacity
            shipmentBuilder.addSizeDimension(WEIGHT_INDEX, 1);

            Shipment shipment = shipmentBuilder.build();
            shipments.add(shipment);
        }
    }

    private Location getLocation(JSONObject jsonLocation) {
        float longitude = jsonLocation.getFloat("lon");
        float latitude = jsonLocation.getFloat("lat");
        Location location = Location.newInstance(longitude, latitude);
        return location;
    }
}