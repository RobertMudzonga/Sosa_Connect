import type { Product } from '../components/common/ProductCard';
import type { Service } from '../hooks/useServices';

export const toProduct = (s: Service): Product => ({
  id: s.id,
  providerId: s.providerId,
  title: s.title,
  price: s.price,
  currency: s.currency,
  location: s.provider?.city || '',
  rating: s.provider?.rating,
  providerName: s.provider?.businessName || 'Seller',
  category: s.category,
  imageUrl: s.imageUrl,
  isVerified: !!s.provider?.isVerified,
  isAvailable: s.isAvailable !== false && s.stock !== 0,
  hasOptions: !!s.optionGroups?.length,
});
