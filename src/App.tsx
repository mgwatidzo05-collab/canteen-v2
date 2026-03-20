import React, { createContext, useContext, useEffect, useState, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useParams, useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { UserProfile, UserRole, Canteen, MenuItem, Order, CartItem, OrderStatus } from './types';
import { cn } from './lib/utils';
import { Loader2, LogOut, LayoutDashboard, Store, ShoppingBag, User as UserIcon, Menu, ArrowLeft, Copy, ExternalLink, Trash2, Plus, X, Star, Mail, Lock, AlertCircle, CheckCircle, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Constants ---
const GUEST_PROFILE: UserProfile = {
  uid: 'guest',
  username: 'Guest User',
  role: 'customer'
};

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    const state = (this as any).state;
    if (state.hasError) {
      const errorMessage = state.error.message || String(state.error);

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/20 p-8 rounded-3xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="text-red-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">Application Error</h2>
            <p className="text-zinc-400 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-zinc-800 text-zinc-100 py-3 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const AuthContext = createContext<any>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (!error && data) {
      setProfile({
        uid: data.id,
        username: data.username,
        role: data.role as UserRole,
        canteenId: data.canteen_id
      });
    }
    setLoading(false);
  };

  const logout = async () => {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // Use phone number as email for Supabase Auth (simple workaround)
      const email = `${phone}@canteenconnect.com`;

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              username: name,
              role: 'customer'
            });
          if (profileError) throw profileError;
        }
      }
      navigate('/');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-md shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-4">
            <UserIcon size={32} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-zinc-400 mt-2">
            {isLogin ? 'Sign in to your account' : 'Join CanteenConnect today'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Full Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          )}
          <div className="relative">
            <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="tel"
              placeholder="Phone Number"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-semibold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-500 hover:text-emerald-400 text-sm font-medium transition-colors block w-full"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
          
          <Link to="/" className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center justify-center gap-1 transition-colors pt-2">
            <ArrowLeft size={14} /> Back to Marketplace
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

// --- Components ---

const Navbar = () => {
  const { cart, setIsCartOpen } = useCart();
  const { user, profile, loading, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAuthenticated = !!user || !!profile;

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <span className="text-xl font-bold tracking-tight text-zinc-100">CanteenConnect</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/admin" className="text-sm font-medium text-zinc-400 hover:text-emerald-500 transition-colors flex items-center gap-1">
              <LayoutDashboard size={16} /> Admin
            </Link>
            <Link to="/owner" className="text-sm font-medium text-zinc-400 hover:text-emerald-500 transition-colors flex items-center gap-1">
              <Store size={16} /> My Canteen
            </Link>
            <Link to="/orders" className="text-sm font-medium text-zinc-400 hover:text-emerald-500 transition-colors flex items-center gap-1">
              <ShoppingBag size={16} /> My Orders
            </Link>
            <Link to="/explore" className="text-sm font-medium text-zinc-400 hover:text-emerald-500 transition-colors flex items-center gap-1">
              <Store size={16} /> Marketplace
            </Link>
            
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-zinc-400 hover:text-emerald-500 transition-colors"
            >
              <ShoppingBag size={20} />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.reduce((acc, curr) => acc + curr.quantity, 0)}
                </span>
              )}
            </button>

            {!loading && (
              isAuthenticated ? (
                <div className="flex items-center gap-4 border-l border-zinc-800 pl-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                      <UserIcon size={16} />
                    </div>
                    <span className="text-sm font-medium text-zinc-300">{profile?.username || user?.email?.split('@')[0] || 'User'}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-all"
                >
                  Sign In
                </Link>
              )
            )}
          </div>

          <button 
            className="md:hidden p-2 text-zinc-100 hover:bg-zinc-800 rounded-xl transition-all border border-transparent active:border-zinc-700" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-zinc-900 border-b border-zinc-800 px-4 py-4 flex flex-col gap-4"
          >
            {isAuthenticated && (
              <div className="flex items-center gap-2 px-2 py-2 border-b border-zinc-800 mb-2">
                <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                  <UserIcon size={16} />
                </div>
                <span className="text-sm font-medium text-zinc-300">{profile?.username || user?.email?.split('@')[0] || 'User'}</span>
              </div>
            )}
            <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="text-zinc-100 hover:text-emerald-500 transition-colors">Admin Portal</Link>
            <Link to="/owner" onClick={() => setIsMenuOpen(false)} className="text-zinc-100 hover:text-emerald-500 transition-colors">Canteen Portal</Link>
            <Link to="/orders" onClick={() => setIsMenuOpen(false)} className="text-zinc-100 hover:text-emerald-500 transition-colors">My Orders</Link>
            <Link to="/explore" onClick={() => setIsMenuOpen(false)} className="text-zinc-100 hover:text-emerald-500 transition-colors">Marketplace</Link>
            {!loading && (
              isAuthenticated ? (
                <button onClick={() => { logout(); setIsMenuOpen(false); }} className="text-left text-red-500 hover:text-red-400 transition-colors font-medium">Logout</button>
              ) : (
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-emerald-500 font-bold">Sign In</Link>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Cart Context ---
interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      // Enforce single canteen cart
      if (prev.length > 0 && prev[0].canteenId !== item.canteenId) {
        if (window.confirm("Adding this item will clear your current cart from another canteen. Continue?")) {
          return [{ ...item, quantity: 1 }];
        }
        return prev;
      }

      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { isCartOpen, setIsCartOpen, cart } = useCart();
  const cartItemCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      {/* Floating Cart Button */}
      {!isCartOpen && cartItemCount > 0 && (
        <motion.button
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-8 right-8 z-40 bg-emerald-600 text-white p-4 rounded-full shadow-2xl shadow-emerald-600/40 flex items-center gap-2 group border border-emerald-500/20"
        >
          <div className="relative">
            <ShoppingBag size={24} />
            <span className="absolute -top-2 -right-2 bg-white text-emerald-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
              {cartItemCount}
            </span>
          </div>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold text-sm whitespace-nowrap">
            View Cart
          </span>
        </motion.button>
      )}

      <AnimatePresence>
        {isCartOpen && (
          <CartDrawer onClose={() => setIsCartOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <Router>
            <MainLayout>
              <Routes>
                <Route path="/" element={<ExploreCanteens />} />
                <Route path="/explore" element={<ExploreCanteens />} />
                <Route path="/canteen/:id" element={<CanteenDetails />} />
                <Route path="/orders" element={<MyOrders />} />
                <Route path="/admin" element={<AdminPortal />} />
                <Route path="/owner" element={<OwnerPortal />} />
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </MainLayout>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// --- Placeholder Components for Portals ---
const ExploreCanteens = () => {
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const fetchCanteens = async () => {
      try {
        const { data, error } = await supabase
        .from('canteens')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching canteens:', error);
        return;
      }

      const canteenList = data.map(d => ({
        id: d.id,
        name: d.name,
        ownerId: d.owner_id,
        ownerName: d.owner_name,
        ownerEmail: d.owner_email,
        ownerPhone: d.owner_phone,
        ownerCode: d.owner_code,
        status: d.status,
        ecoCashNumber: d.ecocash_number,
        ecoCashRate: d.ecocash_rate,
        address: d.address,
        notice: d.notice,
        isAcceptingOrders: d.is_accepting_orders,
        rating: d.rating,
        reviewCount: d.review_count
      } as Canteen));
      
      setCanteens(canteenList);
      } catch (err: any) {
        console.error('Error fetching canteens:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCanteens();

    // Set up real-time subscription
    const channel = supabase
      .channel('canteens-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canteens' }, () => {
        fetchCanteens();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
      <p className="text-zinc-500 animate-pulse">Loading Marketplace...</p>
    </div>
  );

  return (
    <div className="space-y-12">
      <header className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 p-8 md:p-12 border border-zinc-800">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-black text-zinc-100 mb-4 tracking-tight">
            Delicious meals, <span className="text-emerald-500">ready</span> for collection.
          </h2>
          <p className="text-zinc-400 text-lg mb-6">Order from your favorite campus canteens and collect when ready.</p>
          {!authLoading && !user && !profile && (
            <Link to="/login" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20">
              Sign In to Order <ArrowLeft className="rotate-180" size={18} />
            </Link>
          )}
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-20 -mt-20" />
      </header>

      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-2xl font-bold text-zinc-100">Browse Canteens</h3>
            <p className="text-zinc-500 text-sm">Find your favorite kitchen</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {canteens.map(canteen => (
            <Link
              key={canteen.id}
              to={`/canteen/${canteen.id}`}
              className="group bg-zinc-900 rounded-[2rem] border border-zinc-800 shadow-sm hover:border-emerald-500/50 transition-all overflow-hidden flex flex-col"
            >
              <div className="h-48 bg-zinc-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent z-10" />
                {!canteen.isAcceptingOrders && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                    <span className="bg-red-600 text-white px-6 py-2 rounded-full text-sm font-black tracking-widest">BUSY / CLOSED</span>
                  </div>
                )}
                <div className="absolute bottom-4 left-6 z-20">
                  <h3 className="text-2xl font-black text-zinc-100 group-hover:text-emerald-500 transition-colors leading-tight">{canteen.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-amber-500 font-bold flex items-center gap-1 text-sm">★ {canteen.rating.toFixed(1)}</span>
                    <span className="text-zinc-400 text-xs">• {canteen.reviewCount} reviews</span>
                  </div>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <p className="text-zinc-400 text-sm mb-4 line-clamp-2 italic">"{canteen.address || 'Campus Location'}"</p>
                {canteen.notice && (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl text-xs text-emerald-400 font-medium flex items-center gap-2">
                    <span className="animate-pulse">📢</span> {canteen.notice}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

const CanteenDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [canteen, setCanteen] = useState<Canteen | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !id) return;

    const fetchCanteenData = async () => {
      try {
        const { data: canteenData, error: canteenError } = await supabase
          .from('canteens')
          .select('*')
          .eq('id', id)
          .single();

        if (canteenError) throw canteenError;

        setCanteen({
          id: canteenData.id,
          name: canteenData.name,
          ownerId: canteenData.owner_id,
          ownerName: canteenData.owner_name,
          ownerEmail: canteenData.owner_email,
          ownerPhone: canteenData.owner_phone,
          ownerCode: canteenData.owner_code,
          status: canteenData.status,
          ecoCashNumber: canteenData.ecocash_number,
          ecoCashRate: canteenData.ecocash_rate,
          address: canteenData.address,
          notice: canteenData.notice,
          isAcceptingOrders: canteenData.is_accepting_orders,
          rating: canteenData.rating,
          reviewCount: canteenData.review_count
        } as Canteen);

        const { data: menuData, error: menuError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('canteen_id', id);

        if (menuError) throw menuError;
        if (menuData) {
          setMenuItems(menuData.map(d => ({
            id: d.id,
            canteenId: d.canteen_id,
            name: d.name,
            price: d.price,
            description: d.description,
            imageUrl: d.image_url
          } as MenuItem)));
        }
      } catch (err) {
        console.error('Error fetching canteen data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCanteenData();

    // Set up real-time subscription
    const channel = supabase
      .channel(`canteen-details-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canteens', filter: `id=eq.${id}` }, () => {
        fetchCanteenData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `canteen_id=eq.${id}` }, () => {
        fetchCanteenData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (!canteen) return <Loader2 className="animate-spin mx-auto text-emerald-500" size={32} />;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-zinc-100">{canteen.name}</h2>
          <p className="text-zinc-400">{canteen.address}</p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-amber-500 font-bold flex items-center gap-1">★ {canteen.rating.toFixed(1)}</span>
            <span className="text-zinc-500 text-sm">{canteen.reviewCount} reviews</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          {menuItems.length > 4 && (
            <section className="space-y-6">
              <h3 className="text-xl font-bold text-zinc-100">Popular Items</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {menuItems.slice(0, 2).map(item => (
                  <div key={item.id} className="bg-emerald-500/5 p-4 rounded-3xl border border-emerald-500/10 flex gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 blur-2xl -mr-8 -mt-8" />
                    <div className="w-20 h-20 bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0 relative z-10">
                      {item.imageUrl && <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />}
                    </div>
                    <div className="flex-1 flex flex-col justify-between relative z-10">
                      <div>
                        <h4 className="font-bold text-zinc-100">{item.name}</h4>
                        <p className="text-[10px] text-zinc-400 line-clamp-1">{item.description}</p>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold text-emerald-500">${item.price.toFixed(2)}</span>
                        <button
                          disabled={!canteen.isAcceptingOrders}
                          onClick={() => addToCart(item)}
                          className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-6">
            <h3 className="text-xl font-bold text-zinc-100">Full Menu</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuItems.map(item => (
                <div key={item.id} className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 shadow-sm flex gap-4 hover:border-zinc-700 transition-colors">
                  <div className="w-24 h-24 bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0">
                    {item.imageUrl && <img src={item.imageUrl} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-zinc-100">{item.name}</h4>
                      <p className="text-xs text-zinc-400 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-emerald-500">${item.price.toFixed(2)}</span>
                      <button
                        disabled={!canteen.isAcceptingOrders}
                        onClick={() => addToCart(item)}
                        className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg text-sm font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
            <h3 className="font-bold mb-4 text-zinc-100">Your Cart</h3>
            <CartContent canteen={canteen} />
          </div>

          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
            <h3 className="font-bold mb-4 text-zinc-100">Canteen Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">EcoCash Number</span>
                <span className="font-medium text-zinc-100">{canteen.ecoCashNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">EcoCash Rate</span>
                <span className="font-medium text-zinc-100">1 : {canteen.ecoCashRate || 0}</span>
              </div>
              {canteen.notice && (
                <div className="mt-4 p-3 bg-zinc-800/50 rounded-xl border border-zinc-800 italic text-zinc-400">
                  "{canteen.notice}"
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CartContent = () => {
  const { cart, total, removeFromCart, updateQuantity, clearCart, setIsCartOpen } = useCart();
  const { user, profile } = useAuth();
  const [canteen, setCanteen] = useState<Canteen | null>(null);
  const [customerName, setCustomerName] = useState(profile?.username || user?.email?.split('@')[0] || '');
  const [paymentType, setPaymentType] = useState<'code' | 'screenshot'>('code');
  const [paymentProof, setPaymentProof] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cart.length > 0) {
      const canteenId = cart[0].canteenId;
      const supabase = getSupabase();
      if (!supabase) return;

      supabase.from('canteens').select('*').eq('id', canteenId).single().then(({ data, error }) => {
        if (!error && data) {
          setCanteen({
            id: data.id,
            name: data.name,
            ownerId: data.owner_id,
            ownerName: data.owner_name,
            ecoCashNumber: data.ecocash_number,
            ecoCashRate: data.ecocash_rate,
            ecoCashCents: data.ecocash_cents,
            isAcceptingOrders: data.is_accepting_orders,
          } as any);
        }
      });
    }
  }, [cart]);

  const handleCheckout = async () => {
    if (!user) {
      setError("Please sign in to place an order.");
      return;
    }
    
    setError(null);
    if (!canteen) return setError("Canteen info not loaded.");
    if (!customerName.trim()) return setError("Please enter your name.");
    if (!paymentProof.trim()) return setError(`Please enter the ${paymentType === 'code' ? 'EcoCash transaction code' : 'screenshot details'}.`);
    
    const supabase = getSupabase();
    if (!supabase) return setError("Database connection failed.");

    setIsSubmitting(true);
    try {
      const customerId = user.id;

      const { data: insertedData, error: insertError } = await supabase.from('orders').insert({
        customer_id: customerId,
        customer_name: customerName.trim(),
        canteen_id: canteen.id,
        items: cart,
        total: Number(total.toFixed(2)),
        status: 'pending',
        payment_proof: paymentProof.trim(),
        payment_type: paymentType,
      }).select().single();

      if (insertError) throw insertError;

      const orderId = insertedData.id.toString();

      // Track orders for the current user
      const userOrders = JSON.parse(localStorage.getItem(`orders_${customerId}`) || '[]');
      userOrders.push(orderId);
      localStorage.setItem(`orders_${customerId}`, JSON.stringify(userOrders));

      clearCart();
      setOrderSuccess(orderId);
    } catch (err: any) {
      console.error("Checkout Error:", err);
      setError(err.message || "Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-6">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
          <CheckCircle size={48} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">Order Confirmed!</h3>
          <p className="text-zinc-400 mt-2">Your order #{orderSuccess} has been sent.</p>
        </div>
        <div className="pt-4 space-y-3">
          <Link to="/orders" onClick={() => setIsCartOpen(false)} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-500 transition-all block">
            Track Order
          </Link>
          <button onClick={() => { setOrderSuccess(null); setIsCartOpen(false); }} className="w-full text-zinc-500 text-sm hover:text-zinc-300">
            Close
          </button>
        </div>
      </motion.div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-600 mx-auto">
          <ShoppingBag size={32} />
        </div>
        <p className="text-zinc-500 font-medium">Your cart is empty</p>
        <button onClick={() => setIsCartOpen(false)} className="text-emerald-500 text-sm font-bold hover:underline">
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        {/* Items List */}
        <div className="space-y-4">
          {cart.map((item) => (
            <div key={item.id} className="flex gap-4 bg-zinc-800/50 p-3 rounded-2xl border border-zinc-800">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600"><ShoppingBag size={20} /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-zinc-100 truncate">{item.name}</h4>
                <p className="text-xs text-emerald-500 font-mono">${item.price.toFixed(2)}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-lg bg-zinc-700 flex items-center justify-center text-zinc-300 hover:bg-zinc-600">-</button>
                  <span className="text-xs font-bold text-zinc-200">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-lg bg-zinc-700 flex items-center justify-center text-zinc-300 hover:bg-zinc-600">+</button>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500 p-1"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>

        {/* Payment Info */}
        {canteen && (
          <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Payment to {canteen.name}</span>
              <span className="text-xs font-mono text-emerald-500">{canteen.ecoCashNumber}</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Amount</p>
                <p className="text-xl font-black text-zinc-100">${total.toFixed(2)}</p>
              </div>
              {canteen.ecoCashRate && (
                <div className="text-right">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">RTGS (1:{canteen.ecoCashRate})</p>
                  <p className="text-sm font-bold text-emerald-500">{(total * canteen.ecoCashRate).toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Collection Name</label>
            <input
              type="text"
              placeholder="Who is collecting?"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentType('code')} className={cn("py-2.5 rounded-xl text-[10px] font-bold border transition-all uppercase tracking-widest", paymentType === 'code' ? "bg-emerald-600 text-white border-emerald-600" : "bg-zinc-800 text-zinc-500 border-zinc-700")}>EcoCash Code</button>
              <button onClick={() => setPaymentType('screenshot')} className={cn("py-2.5 rounded-xl text-[10px] font-bold border transition-all uppercase tracking-widest", paymentType === 'screenshot' ? "bg-emerald-600 text-white border-emerald-600" : "bg-zinc-800 text-zinc-500 border-zinc-700")}>Screenshot</button>
            </div>
            <input
              type="text"
              placeholder={paymentType === 'code' ? "Enter EcoCash transaction code" : "Paste screenshot link or ID"}
              value={paymentProof}
              onChange={(e) => setPaymentProof(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-emerald-500 transition-colors mt-2"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-6 mt-6 border-t border-zinc-800 space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">
            <AlertCircle size={14} />
            <span className="flex-1">{error}</span>
            {!user && (
              <Link 
                to="/login" 
                onClick={() => setIsCartOpen(false)}
                className="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-red-600 transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
        
        <button
          onClick={handleCheckout}
          disabled={isSubmitting || !canteen}
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : !user ? (
            <LogIn size={20} />
          ) : (
            <CheckCircle size={20} />
          )}
          {isSubmitting ? 'Processing...' : !user ? 'Sign In to Order' : 'Confirm & Place Order'}
        </button>
        
        <p className="text-[10px] text-center text-zinc-500">
          By placing this order, you agree to the canteen's collection policy.
        </p>
      </div>
    </div>
  );
};

const CartDrawer = ({ onClose }: { onClose: () => void }) => {
  const { cart, clearCart } = useCart();
  return (
    <div className="fixed inset-0 z-[100] flex justify-end items-end sm:items-start p-4 pointer-events-none">
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.95 }}
        className="w-full sm:max-w-md bg-zinc-900 shadow-2xl rounded-[2rem] sm:rounded-[2.5rem] flex flex-col border border-zinc-800 pointer-events-auto max-h-[80vh] sm:max-h-[85vh] overflow-hidden"
      >
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
              <ShoppingBag size={18} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-zinc-100">Your Cart</h3>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button 
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear your cart?")) {
                    clearCart();
                  }
                }}
                className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-full transition-all"
                title="Clear Cart"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <CartContent />
        </div>
      </motion.div>
    </div>
  );
};

const ReviewModal = ({ order, onClose }: { order: Order; onClose: () => void }) => {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const currentUserId = profile?.uid || user?.id || 'guest';

    setIsSubmitting(true);
    setError(null);
    try {
      const { error: submitError } = await supabase.from('reviews').insert({
        customer_id: currentUserId,
        canteen_id: order.canteenId,
        rating,
        comment,
      });

      if (submitError) throw submitError;

      // Update canteen rating (simplified)
      const { data: canteenData, error: canteenError } = await supabase
        .from('canteens')
        .select('rating, review_count')
        .eq('id', order.canteenId)
        .single();

      if (!canteenError && canteenData) {
        const currentRating = canteenData.rating || 0;
        const currentCount = canteenData.review_count || 0;
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + rating) / newCount;
        
        await supabase.from('canteens').update({
          rating: newRating,
          review_count: newCount
        }).eq('id', order.canteenId);
      }
      
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Error submitting review:", err);
      setError(err.message || "Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-zinc-900 border border-zinc-800 p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl text-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6"
          >
            <CheckCircle size={48} />
          </motion.div>
          <h3 className="text-2xl font-bold text-zinc-100 mb-2">Thank You!</h3>
          <p className="text-zinc-400">Your review has been submitted successfully.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-zinc-100">Rate Order</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center gap-3 text-sm">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star
                  size={40}
                  className={cn(
                    "transition-colors",
                    star <= rating ? "fill-amber-500 text-amber-500" : "text-zinc-700"
                  )}
                />
              </button>
            ))}
          </div>

          <textarea
            placeholder="Tell us about your meal..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-zinc-100 outline-none focus:border-emerald-500 transition-colors h-32 resize-none"
          />

          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ReviewButton = ({ order }: { order: Order }) => {
  const [showModal, setShowModal] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    const checkReview = async () => {
      const currentUserId = profile?.uid || user?.id;
      if (!currentUserId) return;
      
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('customer_id', currentUserId)
        .eq('canteen_id', order.canteenId)
        .limit(1);

      if (!error && data && data.length > 0) setHasReviewed(true);
    };
    checkReview();
  }, [profile, user, order.canteenId]);

  if (hasReviewed) return <p className="text-xs text-zinc-500 font-medium italic">Review submitted • Thank you!</p>;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 text-sm font-bold text-emerald-500 hover:text-emerald-400 transition-colors group"
      >
        <Star size={16} className="group-hover:fill-emerald-500 transition-all" />
        Rate Order
      </button>
      <AnimatePresence>
        {showModal && <ReviewModal order={order} onClose={() => { setShowModal(false); setHasReviewed(true); }} />}
      </AnimatePresence>
    </>
  );
};

const MyOrders = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const fetchOrders = async () => {
      if (authLoading) return;

      const supabase = getSupabase();
      if (!supabase) return;

      let query = supabase.from('orders').select('*');
      
      const currentUserId = profile?.uid || user?.id;
      
      if (!currentUserId) {
        // Guest mode (though now restricted, keep for legacy/robustness)
        const guestOrders = JSON.parse(localStorage.getItem('guest_orders') || '[]');
        if (guestOrders.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }
        const numericIds = guestOrders.map((id: string) => {
          const num = Number(id);
          return isNaN(num) ? id : num;
        });
        query = query.in('id', numericIds);
      } else {
        // Logged in mode: Check both customer_id and local storage for this user
        const userOrders = JSON.parse(localStorage.getItem(`orders_${currentUserId}`) || '[]');
        const numericIds = userOrders.map((id: string) => {
          const num = Number(id);
          return isNaN(num) ? id : num;
        });

        if (numericIds.length > 0) {
          // Use OR logic: either customer_id matches OR the ID is in our local list
          // This handles cases where RLS might be tricky or if the user just placed the order
          query = query.or(`customer_id.eq.${currentUserId},id.in.(${numericIds.join(',')})`);
        } else {
          query = query.eq('customer_id', currentUserId);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
      }

      if (!error && data) {
        setOrders(data.map(d => ({
          id: d.id.toString(),
          customerId: d.customer_id,
          customerName: d.customer_name,
          canteenId: d.canteen_id,
          items: d.items,
          total: d.total,
          status: d.status,
          paymentProof: d.payment_proof,
          paymentType: d.payment_type,
          createdAt: d.created_at
        } as Order)));
      }
      setLoading(false);
    };

    fetchOrders();

    const channel = supabase
      .channel(`my-orders-${profile?.uid || user?.id || 'guest'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: (profile?.uid || user?.id) ? `customer_id=eq.${profile?.uid || user?.id}` : undefined
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, user, authLoading]);

  if (loading) return <Loader2 className="animate-spin mx-auto text-emerald-500" size={32} />;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-zinc-100">My Orders</h2>
          <p className="text-zinc-400">Track your meal status in real-time.</p>
        </div>
        {!authLoading && !user && !profile && (
          <Link to="/login" className="text-emerald-500 hover:text-emerald-400 text-sm font-medium flex items-center gap-2 bg-emerald-500/5 px-4 py-2 rounded-2xl border border-emerald-500/10 transition-all">
            <UserIcon size={16} /> Login to sync orders
          </Link>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {orders.map(order => (
          <div key={order.id} className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Order #{order.id.slice(-6)}</p>
                {order.customerName && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-sm font-bold text-zinc-100">{order.customerName}</p>
                  </div>
                )}
                <p className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                order.status === 'pending' && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                order.status === 'preparing' && "bg-blue-500/10 text-blue-500 border border-blue-500/20",
                order.status === 'ready' && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                order.status === 'collected' && "bg-zinc-800 text-zinc-400 border border-zinc-700",
                order.status === 'cancelled' && "bg-red-500/10 text-red-500 border border-red-500/20",
              )}>
                {order.status === 'collected' ? 'Collected' : order.status}
              </div>
            </div>

            <div className="space-y-3 mb-6 relative z-10">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm bg-zinc-800/30 p-2 rounded-xl border border-zinc-800/50">
                  <span className="text-zinc-300 font-medium">{item.quantity}x {item.name}</span>
                  <span className="font-bold text-zinc-100">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="pt-4 mt-4 border-t border-zinc-800 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Amount</p>
                  <p className="text-2xl font-black text-emerald-500">${order.total.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Payment</p>
                  <p className="text-xs text-zinc-300 capitalize">{order.paymentType} • {order.paymentProof.slice(0, 8)}...</p>
                </div>
              </div>
            </div>

            {order.status !== 'collected' && order.status !== 'cancelled' && (
              <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: order.status === 'pending' ? '25%' : 
                           order.status === 'preparing' ? '50%' : 
                           order.status === 'ready' ? '75%' : '100%' 
                  }}
                  className="absolute inset-y-0 left-0 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                />
              </div>
            )}

            {order.status === 'collected' && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <ReviewButton order={order} />
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && (
          <div className="col-span-full py-20 text-center bg-zinc-900 rounded-[2.5rem] border border-zinc-800 border-dashed">
            <ShoppingBag className="mx-auto text-zinc-800 mb-4" size={48} />
            <p className="text-zinc-500 text-lg">No orders found yet.</p>
            {!user && !authLoading ? (
              <div className="mt-4 space-y-4">
                <p className="text-zinc-400 text-sm">Sign in to view your order history and track active orders.</p>
                <Link to="/login" className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-all inline-block shadow-lg shadow-emerald-500/20">
                  Sign In Now
                </Link>
              </div>
            ) : (
              <Link to="/explore" className="text-emerald-500 font-bold mt-4 inline-block hover:underline">Start Ordering</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
const SupabaseStatus = () => {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (!isSupabaseConfigured) {
        setStatus('error');
        setError('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        setStatus('error');
        setError('Failed to initialize Supabase client.');
        return;
      }

      try {
        // We just want to see if the request goes through
        const { error } = await supabase.from('_health_check').select('*').limit(1);
        
        // If we get "Table not found" (PGRST116 or 42P01), it actually means the 
        // connection is WORKING because Supabase responded!
        if (error) {
          const isTableNotFound = error.code === 'PGRST116' || 
                                 error.code === '42P01' || 
                                 error.message?.includes('schema cache') ||
                                 error.message?.includes('does not exist');
          
          if (!isTableNotFound) {
            throw error;
          }
        }
        
        setStatus('connected');
      } catch (err: any) {
        console.error('Supabase connection error:', err);
        let msg = err.message || 'Failed to connect to Supabase';
        if (msg.includes('Failed to fetch')) {
          msg = 'Failed to fetch: The Supabase URL might be incorrect or unreachable. Please check your VITE_SUPABASE_URL.';
        }
        setError(msg);
        setStatus('error');
      }
    };
    checkConnection();
  }, []);

  return (
    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-100">Supabase Connection</h3>
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2",
          status === 'loading' ? "bg-zinc-800 text-zinc-400" :
          status === 'connected' ? "bg-emerald-500/10 text-emerald-500" :
          "bg-red-500/10 text-red-500"
        )}>
          <span className={cn(
            "w-2 h-2 rounded-full",
            status === 'loading' ? "bg-zinc-500 animate-pulse" :
            status === 'connected' ? "bg-emerald-500" :
            "bg-red-500"
          )} />
          {status === 'loading' ? 'Checking...' : status === 'connected' ? 'Connected' : 'Error'}
        </div>
      </div>
      
      {status === 'connected' ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Successfully connected to Supabase! You can now use Supabase for real-time features, storage, or as an alternative database.
          </p>
          <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700">
            <p className="text-xs font-mono text-zinc-500 break-all">
              URL: {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}
            </p>
          </div>
          <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
            <h4 className="text-sm font-bold text-emerald-500 mb-2">Next Steps for Render Deployment:</h4>
            <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4">
              <li>Add <code>VITE_SUPABASE_URL</code> to Render Environment Variables.</li>
              <li>Add <code>VITE_SUPABASE_ANON_KEY</code> to Render Environment Variables.</li>
              <li>Ensure your Supabase project has the necessary tables if you plan to migrate data.</li>
            </ul>
          </div>
        </div>
      ) : status === 'error' ? (
        <div className="space-y-4">
          <p className="text-sm text-red-400">
            {error}
          </p>
          <p className="text-xs text-zinc-500">
            Make sure you have added <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your environment variables in AI Studio or Render.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-zinc-500" size={24} />
        </div>
      )}
    </div>
  );
};

const AdminPortal = () => {
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newCanteenName, setNewCanteenName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'canteens' | 'supabase'>('canteens');

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const fetchCanteens = async () => {
      try {
        const { data, error } = await supabase.from('canteens').select('*');
        if (error) throw error;
        if (data) {
          setCanteens(data.map(d => ({
            id: d.id,
            name: d.name,
            ownerId: d.owner_id,
            ownerName: d.owner_name,
            ownerEmail: d.owner_email,
            ownerPhone: d.owner_phone,
            ownerCode: d.owner_code,
            status: d.status,
            ecoCashNumber: d.ecocash_number,
            ecoCashRate: d.ecocash_rate,
            address: d.address,
            notice: d.notice,
            isAcceptingOrders: d.is_accepting_orders,
            rating: d.rating,
            reviewCount: d.review_count
          } as Canteen)));
        }
      } catch (err) {
        console.error('Error fetching canteens in admin:', err);
      }
    };

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        if (data) {
          setUsers(data.map(d => ({
            uid: d.id,
            username: d.username,
            role: d.role,
            canteenId: d.canteen_id
          } as UserProfile)));
        }
      } catch (err) {
        console.error('Error fetching users in admin:', err);
      }
    };

    fetchCanteens();
    fetchUsers();

    const canteensChannel = supabase
      .channel('admin-canteens')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canteens' }, () => {
        fetchCanteens();
      })
      .subscribe();

    const usersChannel = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canteensChannel);
      supabase.removeChannel(usersChannel);
    };
  }, [isAdminAuthenticated]);

  const handleAddCanteen = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const ownerCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { error } = await supabase.from('canteens').insert({
        name: newCanteenName,
        owner_name: newOwnerName,
        owner_email: newOwnerEmail,
        owner_phone: newOwnerPhone,
        owner_code: ownerCode,
        owner_id: null,
        status: 'active',
        is_accepting_orders: true,
        rating: 0,
        review_count: 0,
        ecocash_rate: 1
      });

      if (error) throw error;
      
      alert(`✅ Canteen registered successfully!\n\nOwner Code: ${ownerCode}\n\nGive this code to the canteen owner so they can claim their portal.`);
      setNewCanteenName('');
      setNewOwnerName('');
      setNewOwnerEmail('');
      setNewOwnerPhone('');
    } catch (error: any) {
      console.error(error);
      alert(`❌ Registration failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAdding(false);
    }
  };

  const toggleCanteenStatus = async (canteen: Canteen) => {
    const newStatus = canteen.status === 'active' ? 'frozen' : 'active';
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('canteens').update({ status: newStatus }).eq('id', canteen.id);
  };

  const generateMissingCode = async (canteen: Canteen) => {
    const ownerCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      await supabase.from('canteens').update({ owner_code: ownerCode }).eq('id', canteen.id);
      alert(`Code generated for ${canteen.name}: ${ownerCode}`);
    } catch (error) {
      console.error(error);
      alert('Failed to generate code');
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const confirmDelete = async (canteenId: string) => {
    const canteen = canteens.find(c => c.id === canteenId);
    if (!canteen) return;
    const supabase = getSupabase();
    if (!supabase) return;
    
    setDeleteStatus(null);
    try {
      const { error } = await supabase.from('canteens').delete().eq('id', canteenId);
      if (error) throw error;
      setDeleteStatus({ message: `✅ Canteen "${canteen.name}" deleted successfully`, type: 'success' });
      setDeletingId(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      setDeleteStatus({ message: `❌ Failed to delete: ${error.message}`, type: 'error' });
    }
  };

  const confirmDeleteAll = async () => {
    setDeleteStatus(null);
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('canteens').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      if (error) throw error;
      setDeleteStatus({ message: `✅ Successfully deleted all canteens.`, type: 'success' });
    } catch (error: any) {
      console.error('Delete all error:', error);
      setDeleteStatus({ message: `❌ Failed to delete all: ${error.message}`, type: 'error' });
    }
    setIsDeletingAll(false);
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <h2 className="text-2xl font-bold mb-4 text-zinc-100">Super Admin Access</h2>
        <p className="text-zinc-400 mb-6">Please enter the super admin password to continue.</p>
        <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-sm">
          <input
            type="password"
            placeholder="Admin Password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && adminPassword === 'muna@2005') {
                setIsAdminAuthenticated(true);
              }
            }}
            className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 mb-4 text-center outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            onClick={() => {
              if (adminPassword === 'muna@2005') {
                setIsAdminAuthenticated(true);
              } else {
                alert('Incorrect password');
              }
            }}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-500 transition-colors"
          >
            Verify & Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-zinc-100">Super Admin Portal</h2>
          <p className="text-zinc-400">Manage canteens, subscriptions, and users.</p>
        </div>
        <Link 
          to="/" 
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-100 rounded-xl hover:bg-zinc-700 transition-colors border border-zinc-700"
        >
          <ArrowLeft size={18} /> Back to Marketplace
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-zinc-100">Register New Canteen</h3>
            <form onSubmit={handleAddCanteen} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Canteen Name</label>
                <input
                  type="text"
                  required
                  value={newCanteenName}
                  onChange={(e) => setNewCanteenName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Owner Email</label>
                <input
                  type="email"
                  required
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Owner Phone</label>
                <input
                  type="tel"
                  required
                  value={newOwnerPhone}
                  onChange={(e) => setNewOwnerPhone(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isAdding}
                className="w-full bg-emerald-600 text-white py-2 rounded-xl font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isAdding ? 'Registering...' : 'Register Canteen'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setActiveTab('canteens')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'canteens' ? "bg-emerald-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              )}
            >
              Canteens
            </button>
            <button
              onClick={() => setActiveTab('supabase')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'supabase' ? "bg-emerald-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              )}
            >
              Supabase Link
            </button>
          </div>

          {activeTab === 'canteens' ? (
            <>
              <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Canteens</h3>
              {canteens.length > 0 && (
                <button
                  onClick={() => setIsDeletingAll(true)}
                  className="text-xs flex items-center gap-1 text-red-500 hover:text-red-400 transition-colors px-3 py-1 rounded-lg border border-red-500/20 hover:bg-red-500/10"
                >
                  <Trash2 size={14} /> Delete All
                </button>
              )}
            </div>

            {deleteStatus && (
              <div className={cn(
                "mb-4 p-3 rounded-xl text-sm font-medium flex items-center justify-between",
                deleteStatus.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
              )}>
                <span>{deleteStatus.message}</span>
                <button onClick={() => setDeleteStatus(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
              </div>
            )}

            {isDeletingAll && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-500 font-bold mb-2 text-sm">⚠️ Are you absolutely sure? This will delete ALL canteens.</p>
                <div className="flex gap-2">
                  <button 
                    onClick={confirmDeleteAll}
                    className="bg-red-600 text-white px-4 py-1 rounded-lg text-xs font-bold hover:bg-red-500"
                  >
                    Yes, Delete Everything
                  </button>
                  <button 
                    onClick={() => setIsDeletingAll(false)}
                    className="bg-zinc-800 text-zinc-100 px-4 py-1 rounded-lg text-xs font-bold hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="pb-3 font-medium text-zinc-500">Name</th>
                    <th className="pb-3 font-medium text-zinc-500">Owner</th>
                    <th className="pb-3 font-medium text-zinc-500">Contact</th>
                    <th className="pb-3 font-medium text-zinc-500">Code</th>
                    <th className="pb-3 font-medium text-zinc-500">Status</th>
                    <th className="pb-3 font-medium text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {canteens.map(canteen => (
                    <tr key={canteen.id}>
                      <td className="py-4 font-medium text-zinc-100">{canteen.name}</td>
                      <td className="py-4">
                        <p className="text-sm font-semibold text-zinc-100">{canteen.ownerName}</p>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col text-xs text-zinc-400">
                          <span>{canteen.ownerEmail}</span>
                          <span>{canteen.ownerPhone}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {canteen.ownerCode ? (
                            <>
                              <code className="bg-zinc-800 px-2 py-1 rounded text-emerald-400 font-mono text-sm border border-emerald-500/20">
                                {canteen.ownerCode}
                              </code>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(canteen.ownerCode);
                                  alert('Code copied to clipboard!');
                                }}
                                className="p-1 text-zinc-500 hover:text-emerald-500 transition-colors"
                                title="Copy Code"
                              >
                                <Copy size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => generateMissingCode(canteen)}
                              className="text-xs bg-emerald-600/10 text-emerald-500 px-2 py-1 rounded border border-emerald-500/20 hover:bg-emerald-600/20 transition-colors"
                            >
                              Generate Code
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-semibold",
                          canteen.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {canteen.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCanteenStatus(canteen)}
                            className={cn(
                              "text-xs font-medium px-3 py-1 rounded-lg border transition-colors",
                              canteen.status === 'active' ? "border-red-500/20 text-red-400 hover:bg-red-500/10" : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                            )}
                          >
                            {canteen.status === 'active' ? 'Freeze' : 'Unfreeze'}
                          </button>
                          <Link
                            to={`/canteen/${canteen.id}`}
                            className="text-xs font-medium px-3 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors flex items-center gap-1"
                          >
                            <ExternalLink size={12} /> View
                          </Link>
                          <button
                            onClick={() => setDeletingId(canteen.id)}
                            className="p-2 text-zinc-500 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
                            title="Delete Canteen"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {deletingId === canteen.id && (
                          <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-500 text-xs font-bold mb-2">Delete "{canteen.name}"?</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => confirmDelete(canteen.id)}
                                className="bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold"
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => setDeletingId(null)}
                                className="bg-zinc-800 text-zinc-100 px-3 py-1 rounded-lg text-[10px] font-bold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

              <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-zinc-100">Users ({users.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {users.map(u => (
                    <div key={u.uid} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-800 border border-zinc-700">
                      <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center">
                        <UserIcon size={20} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100 truncate max-w-[150px]">{u.username}</p>
                        <p className="text-xs text-zinc-400 capitalize">{u.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <SupabaseStatus />
          )}
        </div>
      </div>
    </div>
  );
};
const OwnerPortal = () => {
  const [canteen, setCanteen] = useState<Canteen | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [accessCode, setAccessCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '', imageUrl: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'ready' | 'collected' | 'cancelled'>('pending');

  const fetchCanteenData = async (canteenId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: canteenData, error: canteenError } = await supabase
      .from('canteens')
      .select('*')
      .eq('id', canteenId)
      .single();

    if (!canteenError && canteenData) {
      setCanteen({
        id: canteenData.id,
        name: canteenData.name,
        ownerId: canteenData.owner_id,
        ownerName: canteenData.owner_name,
        ownerEmail: canteenData.owner_email,
        ownerPhone: canteenData.owner_phone,
        ownerCode: canteenData.owner_code,
        status: canteenData.status,
        ecoCashNumber: canteenData.ecocash_number,
        ecoCashRate: canteenData.ecocash_rate,
        address: canteenData.address,
        notice: canteenData.notice,
        isAcceptingOrders: canteenData.is_accepting_orders,
        rating: canteenData.rating,
        reviewCount: canteenData.review_count
      } as Canteen);
    }

    const { data: menuData, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('canteen_id', canteenId);

    if (!menuError && menuData) {
      setMenuItems(menuData.map(d => ({
        id: d.id,
        canteenId: d.canteen_id,
        name: d.name,
        price: d.price,
        description: d.description,
        imageUrl: d.image_url
      } as MenuItem)));
    } else if (menuError) {
      console.error('Error fetching menu items:', menuError);
    }

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('canteen_id', canteenId)
      .order('created_at', { ascending: false });

    if (!orderError && orderData) {
      setOrders(orderData.map(d => ({
        id: d.id.toString(),
        customerId: d.customer_id,
        customerName: d.customer_name,
        canteenId: d.canteen_id,
        items: d.items,
        total: d.total,
        status: d.status,
        paymentProof: d.payment_proof,
        paymentType: d.payment_type,
        createdAt: d.created_at
      } as Order)));
    }
  };

  useEffect(() => {
    if (isAuthenticated && canteen) {
      const supabase = getSupabase();
      if (!supabase) return;

      // Initial fetch
      fetchCanteenData(canteen.id);

      // Real-time subscription
      const channel = supabase
        .channel(`canteen-updates-${canteen.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `canteen_id=eq.${canteen.id}`
          },
          () => {
            fetchCanteenData(canteen.id);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'menu_items',
            filter: `canteen_id=eq.${canteen.id}`
          },
          () => {
            fetchCanteenData(canteen.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, canteen?.id]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('canteens')
        .select('id')
        .eq('owner_code', accessCode.trim().toUpperCase())
        .single();

      if (error || !data) throw new Error("Invalid access code.");
      
      await fetchCanteenData(data.id);
      setIsAuthenticated(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 w-full max-w-md shadow-2xl"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-4">
              <Store size={32} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Owner Portal</h2>
            <p className="text-zinc-400 mt-2">Enter your canteen access code to manage your store.</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Access Code"
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-semibold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
            >
              {isVerifying ? <Loader2 className="animate-spin" size={20} /> : 'Access Portal'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (canteen?.status === 'frozen') {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-red-500/10 rounded-3xl border border-red-500/20">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Account Frozen</h2>
        <p className="text-red-400">Your canteen subscription has been suspended. Please contact the super admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-zinc-100">{canteen?.name}</h2>
          <p className="text-zinc-400">Canteen Management Portal</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              const supabase = getSupabase();
              if (!supabase) return;
              await supabase.from('canteens').update({ is_accepting_orders: !canteen?.isAcceptingOrders }).eq('id', canteen!.id);
            }}
            className={cn(
              "px-6 py-2 rounded-xl font-semibold transition-all shadow-sm",
              canteen?.isAcceptingOrders ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {canteen?.isAcceptingOrders ? 'PANIC: Stop Orders' : 'Start Accepting Orders'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Daily Revenue" value={`$${orders.filter(o => o.status === 'collected').reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}`} />
        <StatCard title="Active Orders" value={orders.filter(o => o.status !== 'collected' && o.status !== 'cancelled').length.toString()} />
        <StatCard title="Rating" value={`${canteen?.rating.toFixed(1)} / 5`} />
        <StatCard title="EcoCash Rate" value={`1 : ${canteen?.ecoCashRate || 0}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-zinc-100">Top Selling Items</h3>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">By Volume</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {menuItems
                .map(item => ({
                  ...item,
                  sales: orders
                    .filter(o => o.status === 'collected')
                    .flatMap(o => o.items)
                    .filter(i => i.id === item.id)
                    .reduce((acc, curr) => acc + curr.quantity, 0)
                }))
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 3)
                .map((item, idx) => (
                  <div key={item.id} className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-800/50 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-2 left-2 w-6 h-6 bg-emerald-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-lg">#{idx + 1}</div>
                    <div className="w-16 h-16 bg-zinc-800 rounded-xl mb-3 overflow-hidden">
                      {item.imageUrl && <img src={item.imageUrl} className="w-full h-full object-cover" />}
                    </div>
                    <p className="font-bold text-zinc-100 text-sm truncate w-full">{item.name}</p>
                    <p className="text-emerald-500 font-black text-xs mt-1">{item.sales} sold</p>
                  </div>
                ))}
            </div>
          </section>
          <section className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="text-xl font-bold text-zinc-100">Order Management</h3>
              <div className="flex flex-wrap gap-2 bg-zinc-800/50 p-1 rounded-2xl border border-zinc-800">
                {(['pending', 'preparing', 'ready', 'collected', 'cancelled'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === tab 
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {tab} ({orders.filter(o => o.status === tab).length})
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {orders.filter(o => o.status === activeTab).map(order => (
                <div key={order.id} className="p-5 rounded-[2rem] border border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/50 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl -mr-12 -mt-12" />
                  
                  <div className="relative z-10 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Order #{order.id.slice(-4)}</p>
                        <h4 className="text-lg font-black text-zinc-100 group-hover:text-emerald-500 transition-colors">
                          {order.customerName || 'Anonymous'}
                        </h4>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        order.status === 'pending' && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                        order.status === 'preparing' && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                        order.status === 'ready' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                      )}>
                        {order.status}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {order.items.map((i, idx) => (
                        <p key={idx} className="text-sm text-zinc-400 flex justify-between">
                          <span>{i.quantity}x {i.name}</span>
                          <span className="text-zinc-500">${(i.price * i.quantity).toFixed(2)}</span>
                        </p>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                      <p className="text-lg font-black text-emerald-500">${order.total.toFixed(2)}</p>
                      <select
                        value={order.status}
                        onChange={async (e) => {
                          const supabase = getSupabase();
                          if (!supabase) return;
                          await supabase.from('orders').update({ status: e.target.value }).eq('id', order.id);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100 text-xs font-bold outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="collected">Collected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {order.paymentProof && (
                      <div className="pt-2">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Payment Proof ({order.paymentType})</p>
                        <p className="text-xs text-zinc-400 font-mono bg-zinc-900/50 p-2 rounded-lg border border-zinc-800 truncate">
                          {order.paymentProof}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {orders.filter(o => o.status === activeTab).length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-[2rem]">
                  <p className="text-zinc-500 font-medium">No {activeTab} orders at the moment.</p>
                </div>
              )}
            </div>
          </section>

          <section className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-zinc-100">Menu Items</h3>
              <button 
                onClick={() => {
                  setEditingItem(null);
                  setNewItem({ name: '', price: '', description: '', imageUrl: '' });
                  setIsItemModalOpen(true);
                }}
                className="bg-emerald-600/10 text-emerald-500 px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600/20 transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuItems.map(item => (
                <div key={item.id} className="flex gap-4 p-4 rounded-3xl border border-zinc-800 bg-zinc-800/30 group relative">
                  <div className="w-20 h-20 bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0">
                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">No Image</div>}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-zinc-100">{item.name}</p>
                    <p className="text-sm text-zinc-400 line-clamp-1">{item.description}</p>
                    <p className="text-emerald-500 font-bold">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => {
                        setEditingItem(item);
                        setNewItem({ 
                          name: item.name, 
                          price: item.price.toString(), 
                          description: item.description || '', 
                          imageUrl: item.imageUrl || '' 
                        });
                        setIsItemModalOpen(true);
                      }}
                      className="p-2 text-zinc-400 hover:text-emerald-500 bg-zinc-900 rounded-lg border border-zinc-800"
                    >
                      <Store size={14} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (!window.confirm('Are you sure you want to delete this item?')) return;
                        const supabase = getSupabase();
                        if (!supabase) return;
                        try {
                          const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
                          if (error) throw error;
                          if (canteen) await fetchCanteenData(canteen.id);
                        } catch (err: any) {
                          console.error('Delete failed:', err);
                          alert(`❌ Delete failed: ${err.message || 'Unknown error'}`);
                        }
                      }}
                      className="p-2 text-zinc-400 hover:text-red-500 bg-zinc-900 rounded-lg border border-zinc-800"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {menuItems.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
                  <p className="text-zinc-500">No items in your menu yet.</p>
                </div>
              )}
            </div>
          </section>

          {/* Add Item Modal */}
          <AnimatePresence>
            {isItemModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden"
                >
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-zinc-100">{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
                    <button onClick={() => setIsItemModalOpen(false)} className="text-zinc-400 hover:text-zinc-100">
                      <X size={24} />
                    </button>
                  </div>
                  <form className="p-6 space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newItem.name || !newItem.price) return;
                    const supabase = getSupabase();
                    if (!supabase) return;

                    setIsSubmitting(true);
                    try {
                      const itemData = {
                        canteen_id: canteen!.id,
                        name: newItem.name,
                        price: parseFloat(newItem.price),
                        description: newItem.description,
                        image_url: newItem.imageUrl
                      };

                      if (editingItem) {
                        const { error } = await supabase.from('menu_items').update(itemData).eq('id', editingItem.id);
                        if (error) throw error;
                      } else {
                        const { error } = await supabase.from('menu_items').insert(itemData);
                        if (error) throw error;
                      }
                      
                      await fetchCanteenData(canteen.id);
                      setNewItem({ name: '', price: '', description: '', imageUrl: '' });
                      setIsItemModalOpen(false);
                      setEditingItem(null);
                    } catch (err: any) {
                      console.error('Menu item operation failed:', err);
                      alert(`❌ Operation failed: ${err.message || 'Unknown error'}`);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Item Name</label>
                      <input
                        required
                        type="text"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 focus:border-emerald-500 outline-none transition-all"
                        placeholder="e.g. Chicken Burger"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Price ($)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={newItem.price}
                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 focus:border-emerald-500 outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Description</label>
                      <textarea
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 focus:border-emerald-500 outline-none transition-all h-20 resize-none"
                        placeholder="Brief description of the item..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Image URL</label>
                      <input
                        type="url"
                        value={newItem.imageUrl}
                        onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 focus:border-emerald-500 outline-none transition-all"
                        placeholder="https://..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 mt-2"
                    >
                      {isSubmitting ? (editingItem ? 'Updating...' : 'Adding...') : (editingItem ? 'Update Item' : 'Add to Menu')}
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-8">
          <section className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-zinc-100">Canteen Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">EcoCash Number</label>
                <input
                  type="text"
                  defaultValue={canteen?.ecoCashNumber}
                  onBlur={async (e) => {
                    const supabase = getSupabase();
                    if (!supabase) return;
                    await supabase.from('canteens').update({ ecocash_number: e.target.value }).eq('id', canteen!.id);
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">EcoCash Rate (USD:RTGS)</label>
                <input
                  type="number"
                  defaultValue={canteen?.ecoCashRate}
                  onBlur={async (e) => {
                    const supabase = getSupabase();
                    if (!supabase) return;
                    await supabase.from('canteens').update({ ecocash_rate: parseFloat(e.target.value) }).eq('id', canteen!.id);
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cents to add to EcoCash</label>
                <input
                  type="number"
                  defaultValue={canteen?.ecoCashCents}
                  onBlur={async (e) => {
                    const supabase = getSupabase();
                    if (!supabase) return;
                    await supabase.from('canteens').update({ ecocash_cents: parseFloat(e.target.value) }).eq('id', canteen!.id);
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. 50"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Extra cents customers should add to their total for EcoCash payments.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Notice Board</label>
                <textarea
                  defaultValue={canteen?.notice}
                  onBlur={async (e) => {
                    const supabase = getSupabase();
                    if (!supabase) return;
                    await supabase.from('canteens').update({ notice: e.target.value }).eq('id', canteen!.id);
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 outline-none h-24 resize-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Address</label>
                <input
                  type="text"
                  defaultValue={canteen?.address}
                  onBlur={async (e) => {
                    const supabase = getSupabase();
                    if (!supabase) return;
                    await supabase.from('canteens').update({ address: e.target.value }).eq('id', canteen!.id);
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value }: { title: string, value: string }) => (
  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm">
    <p className="text-sm font-medium text-zinc-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-zinc-100">{value}</p>
  </div>
);
