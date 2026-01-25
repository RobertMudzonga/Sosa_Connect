import {
  AlertOctagon,
  AlertTriangle,
  Home,
  MapPin,
  MessageCircle,
  ShoppingBag,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// --- TYPE DEFINITIONS (Fixes "implicitly has any type" errors) ---

interface Product {
  id: string;
  title: string;
  price: number;
  supplier: string;
  loc: string;
  strikes: number;
}

interface Contact {
  id: string;
  label: string;
  number: string;
  color: string;
}

interface QuickActionProps {
  icon: React.ComponentType<any>; // Allows passing Lucide icons
  label: string;
  color: string;
}

interface HomeScreenProps {
  isSupplier: boolean;
  toggleMode: () => void;
}

// --- THEME CONSTANTS ---
const COLORS = {
  primary: "#0055FF",
  accent: "#FF4500",
  background: "#F5F7FA",
  card: "#FFFFFF",
  text: "#1A1A1A",
  subtext: "#666666",
  danger: "#FF3B30",
  success: "#34C759",
  dark: "#121212",
};

// --- MOCK DATA ---
const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    title: "Honda Fit Engine",
    price: 1200,
    supplier: "AutoParts ZW",
    loc: "Harare",
    strikes: 0,
  },
  {
    id: "2",
    title: "20L Cooking Oil",
    price: 28,
    supplier: "Sosa Wholesale",
    loc: "Bulawayo",
    strikes: 2,
  },
  {
    id: "3",
    title: "Solar Inverter 5kVA",
    price: 450,
    supplier: "PowerSol",
    loc: "Mutare",
    strikes: 0,
  },
];

const EMERGENCY_CONTACTS: Contact[] = [
  { id: "1", label: "AMBULANCE", number: "999", color: COLORS.danger },
  { id: "2", label: "POLICE", number: "995", color: "#0047AB" },
  { id: "3", label: "FIRE", number: "993", color: "#FF8C00" },
  { id: "4", label: "TOWING", number: "0777...", color: "#333" },
];

//Helper for Quick Actions
const QuickAction: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  color,
}) => (
  <TouchableOpacity style={styles.quickAction}>
    <View style={[styles.iconBox, { backgroundColor: color + "20" }]}>
      <Icon size={24} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

// ==========================================
// 1. SUB-COMPONENTS (SCREENS)
// ==========================================

// --- HOME SCREEN COMPONENT ---
const HomeScreen: React.FC<HomeScreenProps> = ({ isSupplier, toggleMode }) => (
  <View style={styles.contentContainer}>
    {/* Header */}
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Mhoro, Tinashe 👋</Text>
        <Text style={styles.location}>
          <MapPin size={14} color={COLORS.subtext} /> Harare, CBD
        </Text>
      </View>
      <View style={styles.modeToggle}>
        <Text style={[styles.modeText, !isSupplier && styles.activeMode]}>
          Buyer
        </Text>
        <Switch
          value={isSupplier}
          onValueChange={toggleMode}
          trackColor={{ false: "#ccc", true: COLORS.primary }}
          thumbColor={"#fff"}
        />
        <Text style={[styles.modeText, isSupplier && styles.activeMode]}>
          Seller
        </Text>
      </View>
    </View>

    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          {isSupplier ? "Manage your Inventory" : "Find Supplies Near You"}
        </Text>
        <Text style={styles.bannerSub}>
          {isSupplier
            ? "You have 2 active listings"
            : "Satellite Shops are open until 8pm"}
        </Text>
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.grid}>
        {isSupplier ? (
          <>
            <QuickAction
              icon={ShoppingBag}
              label="My Listings"
              color={COLORS.primary}
            />
            <QuickAction
              icon={AlertOctagon}
              label="Strikes (0/10)"
              color={COLORS.accent}
            />
            <QuickAction
              icon={MessageCircle}
              label="Messages"
              color={COLORS.success}
            />
          </>
        ) : (
          <>
            <QuickAction
              icon={ShoppingBag}
              label="Satellite Shop"
              color={COLORS.primary}
            />
            <QuickAction icon={MapPin} label="Map View" color="#8E44AD" />
            <QuickAction
              icon={AlertTriangle}
              label="Report Issue"
              color={COLORS.accent}
            />
          </>
        )}
      </View>

      {/* Map Placeholder */}
      <Text style={styles.sectionTitle}>
        {isSupplier ? "Recent Views" : "Nearby Satellite Shops"}
      </Text>
      <View style={styles.mapPlaceholder}>
        <MapPin size={40} color="#ccc" />
        <Text style={{ color: "#999", marginTop: 10 }}>
          Map Visualization Loading...
        </Text>
      </View>
    </ScrollView>
  </View>
);

// --- MARKETPLACE SCREEN COMPONENT ---
const MarketplaceScreen = () => {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);

  const handleReport = (productId: string) => {
    Alert.alert("Report Unavailable", "Is this item sold out or fake?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, It's Gone",
        style: "destructive",
        onPress: () => {
          const updated = products.map((p) => {
            if (p.id === productId) return { ...p, strikes: p.strikes + 1 };
            return p;
          });
          setProducts(updated);
          Alert.alert("Strike Recorded", "The supplier has been notified.");
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productImagePlaceholder} />
      <View style={styles.productInfo}>
        <Text style={styles.productTitle}>{item.title}</Text>
        <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
        <Text style={styles.supplierName}>
          {item.supplier} • {item.loc}
        </Text>
        {item.strikes > 0 && (
          <Text style={styles.strikeWarning}>
            ⚠️ {item.strikes} reports flagged
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.reportBtn}
        onPress={() => handleReport(item.id)}
      >
        <AlertTriangle size={18} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.screenHeader}>Marketplace</Text>
      </View>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
};

// --- EMERGENCY SCREEN COMPONENT ---
const EmergencyScreen = () => {
  const handleSOS = (service: string) => {
    Alert.alert("CONFIRM SOS", `Calling ${service}...`);
  };

  return (
    <View style={[styles.contentContainer, { backgroundColor: COLORS.dark }]}>
      <View style={styles.emergencyHeader}>
        <AlertOctagon size={64} color={COLORS.danger} />
        <Text style={styles.emergencyTitle}>EMERGENCY HUB</Text>
        <Text style={styles.emergencySub}>Your location is being tracked</Text>
      </View>

      <View style={styles.sosGrid}>
        {EMERGENCY_CONTACTS.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={[styles.sosButton, { backgroundColor: contact.color }]}
            onPress={() => handleSOS(contact.label)}
          >
            <Text style={styles.sosLabel}>{contact.label}</Text>
            <Text style={styles.sosNumber}>{contact.number}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ==========================================
// 2. MAIN APP COMPONENT (The "Index")
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
// 3. STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  contentContainer: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  greeting: { fontSize: 20, fontWeight: "bold", color: COLORS.text },
  location: { color: COLORS.subtext, marginTop: 4 },
  screenHeader: { fontSize: 24, fontWeight: "bold", color: COLORS.text },

  // Mode Toggle
  modeToggle: { alignItems: "center", flexDirection: "row" },
  modeText: {
    fontSize: 10,
    marginHorizontal: 5,
    fontWeight: "600",
    color: COLORS.subtext,
  },
  activeMode: { color: COLORS.primary },

  // Banner
  banner: {
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  bannerText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  bannerSub: { color: "#ffffff90", marginTop: 5 },

  // Quick Actions
  grid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  quickAction: { alignItems: "center", width: 100 },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: { fontSize: 12, color: COLORS.text, fontWeight: "500" },

  // Map Placeholder
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 20,
    marginBottom: 10,
    color: COLORS.text,
  },
  mapPlaceholder: {
    height: 180,
    margin: 20,
    backgroundColor: "#E1E4E8",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D4D8",
    borderStyle: "dashed",
  },

  // Marketplace Cards
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginBottom: 15,
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: "#eee",
    borderRadius: 8,
  },
  productInfo: { flex: 1, marginLeft: 12 },
  productTitle: { fontWeight: "bold", fontSize: 16, color: "#333" },
  productPrice: {
    color: COLORS.primary,
    fontWeight: "bold",
    marginVertical: 2,
  },
  supplierName: { fontSize: 12, color: COLORS.subtext },
  strikeWarning: {
    fontSize: 10,
    color: COLORS.danger,
    marginTop: 4,
    fontWeight: "bold",
  },
  reportBtn: { padding: 10, backgroundColor: "#FFF0F0", borderRadius: 20 },

  // Emergency Screen
  emergencyHeader: { alignItems: "center", marginTop: 60, marginBottom: 40 },
  emergencyTitle: {
    color: COLORS.danger,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 10,
    letterSpacing: 1,
  },
  emergencySub: { color: "#888" },
  sosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    justifyContent: "center",
  },
  sosButton: {
    width: "44%",
    height: 110,
    margin: 8,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  sosLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  sosNumber: { color: "#ffffff90", fontSize: 14 },

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
