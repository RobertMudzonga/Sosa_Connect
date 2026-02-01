import { AlertTriangle, Home, ShoppingBag } from "lucide-react-native";
import React, { useState } from "react";
import {
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../screens/constants";
import { EmergencyScreen } from "../screens/emergency-screen";
import { HomeScreen } from "../screens/home-screen";
import { MarketplaceScreen } from "../screens/marketplace-screen";

// ==========================================
// MAIN APP COMPONENT (The "Index")
// ==========================================
export default function SosaApp() {
  const [activeTab, setActiveTab] = useState<"Home" | "Market" | "Emergency">(
    "Home",
  );
  const [isSupplier, setIsSupplier] = useState<boolean>(false);

  // Function to determine what screen to show
  const renderContent = () => {
    switch (activeTab) {
      case "Home":
        return (
          <HomeScreen
            isSupplier={isSupplier}
            toggleMode={() => setIsSupplier(!isSupplier)}
          />
        );
      case "Market":
        return <MarketplaceScreen />;
      case "Emergency":
        return <EmergencyScreen />;
      default:
        return (
          <HomeScreen
            isSupplier={isSupplier}
            toggleMode={() => setIsSupplier(!isSupplier)}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={activeTab === "Emergency" ? "light-content" : "dark-content"}
      />

      {/* 1. Main Content Area */}
      <View style={{ flex: 1 }}>{renderContent()}</View>

      {/* 2. Custom Bottom Tab Bar */}
      <View
        style={[styles.tabBar, activeTab === "Emergency" && styles.darkTabBar]}
      >
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab("Home")}
        >
          <Home color={activeTab === "Home" ? COLORS.primary : "#999"} />
          <Text
            style={[
              styles.tabText,
              activeTab === "Home" && styles.activeTabText,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab("Market")}
        >
          <ShoppingBag
            color={activeTab === "Market" ? COLORS.primary : "#999"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "Market" && styles.activeTabText,
            ]}
          >
            Market
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab("Emergency")}
        >
          <AlertTriangle
            color={activeTab === "Emergency" ? COLORS.danger : "#999"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "Emergency" && { color: COLORS.danger },
            ]}
          >
            SOS
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // Custom Tab Bar
  tabBar: {
    flexDirection: "row",
    height: 70,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    justifyContent: "space-around",
    alignItems: "center",
  },
  darkTabBar: { backgroundColor: "#222", borderColor: "#333" },
  tabItem: { alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 10, marginTop: 4, color: "#999" },
  activeTabText: { color: COLORS.primary, fontWeight: "bold" },
});
