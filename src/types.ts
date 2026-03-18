export type UserRole = 'admin' | 'owner' | 'customer';

export interface UserProfile {
  uid: string;
  username: string;
  role: UserRole;
  canteenId?: string;
}

export interface Canteen {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerCode: string;
  status: 'active' | 'frozen';
  ecoCashNumber?: string;
  ecoCashRate?: number;
  ecoCashCents?: number;
  address?: string;
  notice?: string;
  isAcceptingOrders: boolean;
  rating: number;
  reviewCount: number;
}

export interface MenuItem {
  id: string;
  canteenId: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'collected' | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  customerName?: string;
  canteenId: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentProof?: string;
  paymentType?: 'code' | 'screenshot';
  createdAt: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Review {
  id: string;
  customerId: string;
  canteenId: string;
  rating: number;
  comment: string;
  createdAt: string;
}
