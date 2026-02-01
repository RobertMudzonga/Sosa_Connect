import * as Location from "expo-location";
import {
  Ambulance,
  Car,
  Flame,
  MapPin,
  Menu,
  Pencil,
  Shield,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "./constants";

import MapView, { Marker, PROVIDER_GOOGLE } from "../../components/Map";

interface LocationCoords {
  latitude: number;
  longitude: number;
}

// --- EMERGENCY SCREEN COMPONENT ---
export const EmergencyScreen = () => {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [address, setAddress] = useState<string>("Locating...");
  const [loading, setLoading] = useState(true);
  const [pressTimer, setPressTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required for emergency services.",
        );
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setLocation(coords);

      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync(coords);
      if (geocode.length > 0) {
        const place = geocode[0];
        const addressText = [
          place.street,
          place.district,
          place.city,
          place.region,
        ]
          .filter(Boolean)
          .join(", ");
        setAddress(addressText || "Current Location");
      }

      setLoading(false);
    } catch (error) {
      console.error("Error getting location:", error);
      setAddress("Location unavailable");
      setLoading(false);
    }
  };

  const handlePressIn = (service: string) => {
    const timer = setTimeout(() => {
      handleEmergencyCall(service);
    }, 3000);
    setPressTimer(timer);
  };

  const handlePressOut = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleEmergencyCall = (service: string) => {
    Alert.alert(
      "EMERGENCY ALERT",
      `Alerting ${service} services with your current location.\n\n${address}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: () => {
            // Here you would implement actual emergency service call
            Alert.alert("Help is on the way!", `${service} has been notified.`);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : location ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            showsUserLocation
            showsMyLocationButton={false}
          >
            <Marker
              coordinate={location}
              title="Your Location"
              description={address}
            />
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Unable to get location</Text>
          </View>
        )}

        {/* Header Overlay */}
        <View style={styles.headerOverlay}>
          <Text style={styles.headerTitle}>Emergency Response</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Menu size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Current Location Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationIconContainer}>
            <MapPin size={24} color={COLORS.primary} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>CURRENT LOCATION</Text>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {address}
            </Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={getLocation}>
            <Pencil size={20} color={COLORS.subtext} />
          </TouchableOpacity>
        </View>

        {/* Instruction Text */}
        <Text style={styles.instructionText}>
          Press and hold for 3 seconds to alert services.
        </Text>

        {/* Emergency Buttons Grid */}
        <View style={styles.emergencyGrid}>
          <TouchableOpacity
            style={[styles.emergencyButton, styles.ambulanceButton]}
            onPressIn={() => handlePressIn("Ambulance")}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <View style={styles.iconCircle}>
              <Ambulance size={40} color="#FFF" strokeWidth={2.5} />
            </View>
            <Text style={styles.buttonLabel}>Ambulance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.emergencyButton, styles.fireButton]}
            onPressIn={() => handlePressIn("Fire")}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <View style={styles.iconCircle}>
              <Flame size={40} color="#FFF" strokeWidth={2.5} />
            </View>
            <Text style={styles.buttonLabel}>Fire</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.emergencyButton, styles.policeButton]}
            onPressIn={() => handlePressIn("Police")}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <View style={styles.iconCircle}>
              <Shield size={40} color="#FFF" strokeWidth={2.5} />
            </View>
            <Text style={styles.buttonLabel}>Police</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.emergencyButton, styles.towingButton]}
            onPressIn={() => handlePressIn("Towing")}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <View style={styles.iconCircle}>
              <Car size={40} color="#FFF" strokeWidth={2.5} />
            </View>
            <Text style={styles.buttonLabel}>Towing</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Map Section
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.card,
  },
  errorText: {
    color: COLORS.text,
    fontSize: 16,
  },

  // Header Overlay
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "700",
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Bottom Section
  bottomSection: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    marginTop: -20,
  },

  // Location Card
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  locationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    color: COLORS.subtext,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  locationAddress: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  // Instruction Text
  instructionText: {
    color: COLORS.subtext,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },

  // Emergency Buttons Grid
  emergencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  emergencyButton: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  buttonLabel: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },

  // Button Colors
  ambulanceButton: {
    backgroundColor: "#DC2626",
  },
  fireButton: {
    backgroundColor: "#EA580C",
  },
  policeButton: {
    backgroundColor: "#1E40AF",
  },
  towingButton: {
    backgroundColor: "#EAB308",
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.card,
    gap: 12,
  },
  webMapText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "600",
  },
  webMapSubtext: {
    color: COLORS.subtext,
    fontSize: 14,
  },
  webMapNote: {
    color: COLORS.subtext,
    fontSize: 12,
    fontStyle: "italic",
  },
});
