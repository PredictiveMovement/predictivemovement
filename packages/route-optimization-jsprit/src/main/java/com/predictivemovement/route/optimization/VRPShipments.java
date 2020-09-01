package com.predictivemovement.route.optimization;

import java.util.ArrayList;
import java.util.List;

import com.graphhopper.jsprit.core.problem.Location;
import com.graphhopper.jsprit.core.problem.job.Shipment;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * This class sets the shipments for the VRP based on the incoming request.
 */
public class VRPShipments {

    private static final int SHIPMENT_DEFAULT_VOLUME = 19 * 18 * 14;
    private static final int SHIPMENT_DEFAULT_WEIGHT = 1;

    List<Shipment> shipments;
    private VRPSetting vrpSetting;
    private JSONObject routeRequest;

    VRPShipments(VRPSetting vrpSetting) {
        this.vrpSetting = vrpSetting;
        this.routeRequest = vrpSetting.routeRequest;
    }

    protected List<Shipment> createShipments() {
        shipments = new ArrayList<>();

        JSONArray jsonBookings = routeRequest.getJSONArray("bookings");
        for (Object jsonBookingObj : jsonBookings) {
            JSONObject jsonBooking = (JSONObject) jsonBookingObj;

            // id
            String shipmentId = jsonBooking.getString("id");
            Shipment.Builder shipmentBuilder = Shipment.Builder.newInstance(shipmentId);

            // pickup
            JSONObject jsonPickup = jsonBooking.getJSONObject("pickup");
            Location pickupLocation = vrpSetting.getLocation(jsonPickup);
            shipmentBuilder.setPickupLocation(pickupLocation);
            vrpSetting.locations.put(jsonPickup.getString("hint"), pickupLocation);

            // delivery
            JSONObject jsonDelivery = jsonBooking.getJSONObject("delivery");
            Location deliveryLocation = vrpSetting.getLocation(jsonDelivery);
            shipmentBuilder.setDeliveryLocation(deliveryLocation);
            vrpSetting.locations.put(jsonDelivery.getString("hint"), deliveryLocation);

            // time windows
            VRPSettingTimeWindows timeWindows = new VRPSettingTimeWindows();
            timeWindows.add(jsonPickup, (timeWindow) -> {
                shipmentBuilder.addPickupTimeWindow(timeWindow);
            });
            timeWindows.add(jsonDelivery, (timeWindow) -> {
                shipmentBuilder.addDeliveryTimeWindow(timeWindow);
            });

            // weight and volumes
            JSONObject size = jsonBooking.optJSONObject("size");
            // should be also done by the function inside
            if (size == null) {
                shipmentBuilder.addSizeDimension(VRPSetting.VOLUME_INDEX, SHIPMENT_DEFAULT_VOLUME);
                shipmentBuilder.addSizeDimension(VRPSetting.WEIGHT_INDEX, SHIPMENT_DEFAULT_WEIGHT);
            } else {
                JSONArray measurements = size.optJSONArray("measurements");
                int weight = size.optInt("weight", SHIPMENT_DEFAULT_WEIGHT);
                int volume = getVolumeFromMeasurements(measurements);
                shipmentBuilder.addSizeDimension(VRPSetting.VOLUME_INDEX, volume);
                shipmentBuilder.addSizeDimension(VRPSetting.WEIGHT_INDEX, weight);
            }
            Shipment shipment = shipmentBuilder.build();
            shipments.add(shipment);
        }

        return shipments;
    }

    private int getVolumeFromMeasurements(JSONArray measurements) {
        if (measurements == null)
            return SHIPMENT_DEFAULT_VOLUME;
        int volume = 1;

        for (int i = 0; i < measurements.length(); i++) {
            int measurement = measurements.getInt(i);
            volume *= measurement;
        }

        return volume;
    }
}