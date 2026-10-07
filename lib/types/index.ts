export type NFTCategory = 'art' | 'collectibles' | 'photography' | 'gaming' | 'pfp' | 'generative';
export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'expired';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type ActivityType = 'sale' | 'listing' | 'offer' | 'transfer' | 'mint' | 'cancel';
export type TransactionStatus = 'idle' | 'preparing' | 'awaiting_wallet' | 'broadcasting' | 'confirming' | 'success' | 'error';
export type SortOption = 'recently_listed' | 'recently_sold' | 'price_low' | 'price_high' | 'most_viewed' | 'trending';
export type FilterStatus = 'buy_now' | 'has_offers' | 'new' | 'ending_soon';

export interface Attribute {
  trait_type: string;
  value: string;
}

export interface NFT {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  collectionSlug: string;
  creator: string;
  creatorAddress: string;
  owner: string;
  ownerAddress: string;
  price: number | null;
  currency: string;
  listed: boolean;
  favoriteCount: number;
  viewCount: number;
  rarity: number;
  attributes: Attribute[];
  category: NFTCategory;
  createdAt: string;
  contractAddress: string;
  blockchain: string;
  royalties: number;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  bannerImage: string;
  creator: string;
  creatorAddress: string;
  verified: boolean;
  floorPrice: number;
  volume24h: number;
  volume7d: number;
  totalSupply: number;
  owners: number;
  royalty: number;
  category: NFTCategory;
  createdAt: string;
  featured: boolean;
}

export interface User {
  id: string;
  address: string;
  name: string;
  avatar: string;
  bio: string;
  joinedAt: string;
  following: number;
  followers: number;
}

export interface Listing {
  id: string;
  nftId: string;
  seller: string;
  sellerAddress: string;
  price: number;
  currency: string;
  status: ListingStatus;
  createdAt: string;
  expiresAt: string | null;
}

export interface Offer {
  id: string;
  nftId: string;
  buyer: string;
  buyerAddress: string;
  amount: number;
  currency: string;
  status: OfferStatus;
  createdAt: string;
  expiresAt: string;
}

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  nftId: string;
  nftName: string;
  nftImage: string;
  collection: string;
  fromAddress: string;
  fromName: string;
  toAddress: string;
  toName: string;
  price: number | null;
  currency: string;
  timestamp: string;
  txHash: string;
  txStatus: 'confirmed' | 'pending';
}

export interface WalletConnection {
  address: string;
  balance: number;
  connected: boolean;
}

export interface SearchFilters {
  query: string;
  category: NFTCategory | 'all';
  status: FilterStatus[];
  priceMin: number | null;
  priceMax: number | null;
  collection: string | 'all';
  sort: SortOption;
}
