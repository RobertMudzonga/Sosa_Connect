import { AlertTriangle } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, MOCK_PRODUCTS, Product } from "./constants";

// --- MARKETPLACE SCREEN COMPONENT ---
export const MarketplaceScreen = () => {
  const [products] = useState<Product[]>(MOCK_PRODUCTS);

  const handleReport = (productId: string) => {
    Alert.alert("Report Unavailable", "Is this item sold out or fake?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Report",
        style: "destructive",
        onPress: () => {
          Alert.alert("Reported", "The supplier has been notified.");
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
          {item.supplier} • {item.location}
        </Text>
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

// --- STYLES ---
const styles = StyleSheet.create({
  contentContainer: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    alignItems: "center",
    backgroundColor: COLORS.card,
  },
  screenHeader: { fontSize: 24, fontWeight: "bold", color: COLORS.text },

  // Marketplace Cards
  productCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
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
  productTitle: { fontWeight: "bold", fontSize: 16, color: COLORS.text },
  productPrice: {
    color: COLORS.primary,
    fontWeight: "bold",
    marginVertical: 2,
  },
  supplierName: { fontSize: 12, color: COLORS.subtext },
  reportBtn: { padding: 10, backgroundColor: "#FFF0F0", borderRadius: 20 },
});
