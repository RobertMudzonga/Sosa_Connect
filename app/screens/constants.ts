// --- THEME CONSTANTS ---
export const COLORS = {
  primary: "#0055FF",
  accent: "#FF4500",
  background: "#1A1F2E", // Dark background
  card: "#252B3B", // Dark card
  text: "#FFFFFF",
  subtext: "#8B92A8",
  danger: "#FF3B30",
  success: "#34C759",
  dark: "#121212",
  categoryBlue: "#2D5F8D",
  categoryGreen: "#1F4D3C",
  categoryPurple: "#3B2D5F",
  categoryBrown: "#5F4D2D",
};

// --- TYPE DEFINITIONS ---
export interface Product {
  id: string;
  title: string;
  price: number;
  supplier: string;
  location: string;
  rating?: number;
  image?: string;
  category?: string;
}

export interface Contact {
  id: string;
  label: string;
  number: string;
  color: string;
}

export interface EmergencyService {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

export interface Category {
  id: string;
  title: string;
  icon: string;
  color: string;
}

// --- MOCK DATA ---
export const TRENDING_PRODUCTS: Product[] = [
  {
    id: "1",
    title: "Nike Air Max 2023 - Size 42",
    price: 950,
    supplier: "Emmanuel K.",
    location: "Avondale, Harare",
    rating: 4.8,
    category: "Used",
  },
  {
    id: "2",
    title: "Pro Plumbing Service",
    price: 100,
    supplier: "John's Services",
    location: "Harare",
    category: "Service",
  },
  {
    id: "3",
    title: "MacBook Pro M1",
    price: 12500,
    supplier: "Tech Store",
    location: "CBD, Harare",
    category: "Used",
  },
];

export const EMERGENCY_SERVICES: EmergencyService[] = [
  {
    id: "1",
    title: "Medical Ambulance",
    subtitle: "3 mins away",
    icon: "ambulance",
    color: "#DC2626",
  },
  {
    id: "2",
    title: "Police Station",
    subtitle: "Tap to call",
    icon: "shield",
    color: "#1E40AF",
  },
  {
    id: "3",
    title: "Fire Rescue",
    subtitle: "Tap to call",
    icon: "flame",
    color: "#EA580C",
  },
];

export const CATEGORIES: Category[] = [
  { id: "1", title: "Goods", icon: "shopping-bag", color: COLORS.categoryBlue },
  { id: "2", title: "Food", icon: "utensils", color: COLORS.categoryGreen },
  { id: "3", title: "Services", icon: "wrench", color: COLORS.categoryPurple },
  { id: "4", title: "Delivery", icon: "truck", color: COLORS.categoryBrown },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    title: "Honda Fit Engine",
    price: 1200,
    supplier: "AutoParts ZW",
    location: "Harare",
  },
  {
    id: "2",
    title: "20L Cooking Oil",
    price: 28,
    supplier: "Sosa Wholesale",
    location: "Bulawayo",
  },
  {
    id: "3",
    title: "Solar Inverter 5kVA",
    price: 450,
    supplier: "PowerSol",
    location: "Mutare",
  },
];

export const EMERGENCY_CONTACTS: Contact[] = [
  { id: "1", label: "AMBULANCE", number: "999", color: COLORS.danger },
  { id: "2", label: "POLICE", number: "995", color: "#0047AB" },
  { id: "3", label: "FIRE", number: "993", color: "#FF8C00" },
  { id: "4", label: "TOWING", number: "0777...", color: "#333" },
];
