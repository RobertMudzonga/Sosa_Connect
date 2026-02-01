import {
    Ambulance,
    Filter,
    Flame,
    Heart,
    MapPin,
    Search,
    Shield,
    ShoppingBag,
    Star,
    Truck,
    UtensilsCrossed,
    Wrench,
} from "lucide-react-native";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    CATEGORIES,
    COLORS,
    EMERGENCY_SERVICES,
    TRENDING_PRODUCTS,
} from "./constants";

// --- TYPE DEFINITIONS ---
interface HomeScreenProps {
  isSupplier: boolean;
  toggleMode: () => void;
}

// --- HOME SCREEN COMPONENT ---
export const HomeScreen: React.FC<HomeScreenProps> = ({
  isSupplier,
  toggleMode,
}) => {
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <Text style={styles.appName}>Sosa Connect</Text>
        </View>
        <View style={styles.profilePic}>
          <View style={styles.onlineIndicator} />
        </View>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggleContainer}>
        <TouchableOpacity
          style={[styles.modeButton, !isSupplier && styles.modeButtonActive]}
          onPress={() => (!isSupplier ? null : toggleMode())}
        >
          <Text
            style={[
              styles.modeButtonText,
              !isSupplier && styles.modeButtonTextActive,
            ]}
          >
            Buyer Mode
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, isSupplier && styles.modeButtonActive]}
          onPress={() => (isSupplier ? null : toggleMode())}
        >
          <Text
            style={[
              styles.modeButtonText,
              isSupplier && styles.modeButtonTextActive,
            ]}
          >
            Seller Mode
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>
            {getTimeGreeting()}, <Text style={styles.greetingName}>Amara</Text>
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color={COLORS.subtext} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Find products, services or help.."
            placeholderTextColor={COLORS.subtext}
          />
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Emergency Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.emergencyIcon}>
                <Text style={styles.emergencyIconText}>⚠</Text>
              </View>
              <Text style={styles.sectionTitle}>Emergency Services</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.emergencyGrid}>
            {EMERGENCY_SERVICES.map((service, index) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.emergencyCard,
                  index === 0 && styles.emergencyCardLarge,
                  { backgroundColor: service.color },
                ]}
              >
                <View style={styles.emergencyIconContainer}>
                  {service.icon === "ambulance" && (
                    <Ambulance size={32} color="#FFF" />
                  )}
                  {service.icon === "shield" && (
                    <Shield size={28} color="#FFF" />
                  )}
                  {service.icon === "flame" && <Flame size={28} color="#FFF" />}
                </View>
                <Text style={styles.emergencyTitle}>{service.title}</Text>
                <Text style={styles.emergencySubtitle}>{service.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Browse Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  { backgroundColor: category.color },
                ]}
              >
                <View style={styles.categoryIconContainer}>
                  {category.icon === "shopping-bag" && (
                    <ShoppingBag size={28} color="#FFF" />
                  )}
                  {category.icon === "utensils" && (
                    <UtensilsCrossed size={28} color="#FFF" />
                  )}
                  {category.icon === "wrench" && (
                    <Wrench size={28} color="#FFF" />
                  )}
                  {category.icon === "truck" && (
                    <Truck size={28} color="#FFF" />
                  )}
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Trending Near You */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Near You</Text>
            <TouchableOpacity>
              <Text style={styles.locationText}>Harare, ZW ›</Text>
            </TouchableOpacity>
          </View>

          {TRENDING_PRODUCTS.map((product, index) => (
            <TouchableOpacity key={product.id} style={styles.productCard}>
              <View
                style={[
                  styles.productImage,
                  index === 0 && styles.productImageLarge,
                ]}
              >
                {/* Placeholder for product image */}
                {index === 0 && (
                  <>
                    <View style={styles.priceTag}>
                      <Text style={styles.priceTagText}>
                        ZiG {product.price}
                      </Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Star size={14} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.ratingText}>{product.rating}</Text>
                    </View>
                  </>
                )}
              </View>
              <View style={styles.productInfo}>
                <View style={styles.productHeader}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  {index === 0 && (
                    <TouchableOpacity>
                      <Heart size={20} color={COLORS.subtext} />
                    </TouchableOpacity>
                  )}
                </View>
                {index === 0 && (
                  <>
                    <View style={styles.locationRow}>
                      <MapPin size={14} color={COLORS.subtext} />
                      <Text style={styles.locationText2}>
                        {product.location}
                      </Text>
                    </View>
                    <View style={styles.sellerRow}>
                      <View style={styles.sellerAvatar} />
                      <Text style={styles.sellerText}>
                        Sold by {product.supplier}
                      </Text>
                    </View>
                  </>
                )}
                {index !== 0 && (
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>
                      ZiG {product.price}
                      {product.category === "Service" && "/hr"}
                    </Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {product.category}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  appName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "600",
  },
  profilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FF8C6B",
    position: "relative",
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#34C759",
    position: "absolute",
    bottom: 2,
    right: 2,
    borderWidth: 2,
    borderColor: COLORS.background,
  },

  // Mode Toggle
  modeToggleContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  modeButtonText: {
    color: COLORS.subtext,
    fontSize: 15,
    fontWeight: "600",
  },
  modeButtonTextActive: {
    color: "#FFF",
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },

  // Greeting
  greetingContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "400",
    color: COLORS.text,
  },
  greetingName: {
    fontWeight: "700",
    color: COLORS.primary,
  },

  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  filterButton: {
    padding: 4,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  emergencyIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  emergencyIconText: {
    fontSize: 14,
  },
  viewAllText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  locationText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },

  // Emergency Services
  emergencyGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  emergencyCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    justifyContent: "space-between",
  },
  emergencyCardLarge: {
    minHeight: 140,
  },
  emergencyIconContainer: {
    marginBottom: 8,
  },
  emergencyTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  emergencySubtitle: {
    color: "#FFFFFF90",
    fontSize: 12,
  },

  // Categories
  categoriesGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 16,
  },
  categoryCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  categoryIconContainer: {
    marginBottom: 8,
  },
  categoryTitle: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  // Products
  productCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#4A5568",
  },
  productImageLarge: {
    height: 200,
    backgroundColor: "#B91C1C",
  },
  priceTag: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceTagText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  ratingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#000",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  productInfo: {
    padding: 16,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  productTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "600",
    marginRight: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  locationText2: {
    color: COLORS.subtext,
    fontSize: 13,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sellerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF8C6B",
  },
  sellerText: {
    color: COLORS.subtext,
    fontSize: 13,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productPrice: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  categoryBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: COLORS.subtext,
    fontSize: 11,
    fontWeight: "600",
  },
});
