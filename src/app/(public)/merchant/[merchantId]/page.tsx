'use client';

import { useState, useEffect } from 'react';
import { use, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Store,
  Loader2,
  Bus,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
} from 'lucide-react';

/* ============================================================
   Types
   ============================================================ */

interface MerchantAuthData {
  merchantId: string;
  merchantName: string;
  stationId: string;
  stationName: string;
  loginAt?: string;
}

/* ============================================================
   Dynamic import for MerchantDashboard
   ============================================================ */

const MerchantDashboard = dynamic(
  () =>
    import('@/components/dashboard/merchant-dashboard').then((m) => ({
      default: m.MerchantDashboard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    ),
  },
);

/* ============================================================
   Main Page Component
   ============================================================ */

export default function MerchantPortalPage({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = use(params);
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [merchantData, setMerchantData] = useState<MerchantAuthData | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('merchantAuth');
      if (stored) {
        const data = JSON.parse(stored) as MerchantAuthData;
        if (data.merchantId === merchantId) {
          setMerchantData(data);
          setIsAuthenticated(true);
        }
      }
    } catch {
      // Ignore parse errors
    }
    setIsInitialized(true);
  }, [merchantId]);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/merchants/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const json = await res.json();

      if (json.success) {
        const data: MerchantAuthData = {
          merchantId: json.data.merchantId,
          merchantName: json.data.merchantName,
          stationId: json.data.stationId,
          stationName: json.data.stationName,
          loginAt: json.data.loginAt,
        };
        setMerchantData(data);
        setIsAuthenticated(true);
        localStorage.setItem('merchantAuth', JSON.stringify(data));
      } else {
        setLoginError(json.error === 'Your account is pending validation. Please wait for an administrator to approve your registration.'
          ? 'Votre compte est en attente de validation. Veuillez patienter.'
          : json.error === 'Invalid email or password'
            ? 'Email ou mot de passe incorrect'
            : json.error || 'Identifiants incorrects');
      }
    } catch {
      setLoginError('Erreur de connexion au serveur');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('merchantAuth');
    setMerchantData(null);
    setIsAuthenticated(false);
    setLoginForm({ email: '', password: '' });
    setLoginError('');
  };

  // Wait for initialization check
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // If authenticated, show MerchantDashboard
  if (isAuthenticated && merchantData) {
    return (
      <div className="min-h-screen bg-[#0B0F19]">
        {/* Top Bar */}
        <header className="border-b border-slate-800/60 bg-[#0B0F19]/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Bus className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">TerangaFlow</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 font-medium hidden sm:inline">{merchantData.merchantName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-400 hover:text-white hover:bg-slate-800 gap-1.5 text-xs"
              >
                <Shield className="w-3.5 h-3.5" />
                Déconnexion
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="max-w-5xl mx-auto p-4 sm:p-6">
          <MerchantDashboard
            merchantId={merchantData.merchantId}
            merchantName={merchantData.merchantName}
            stationId={merchantData.stationId}
            stationName={merchantData.stationName}
            onLogout={handleLogout}
          />
        </main>
      </div>
    );
  }

  // Login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/3 blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="login-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md relative z-10"
        >
          <Card className="border border-slate-800/60 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-emerald-500/5 overflow-hidden">
            <CardContent className="p-0">
              {/* Header */}
              <div className="px-8 pt-8 pb-2 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20"
                >
                  <Store className="w-8 h-8 text-white" />
                </motion.div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Espace Marchand
                </h1>
                <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
                  Connectez-vous pour accéder à votre tableau de bord et gérer votre commerce
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="px-8 py-6 space-y-5">
                {/* Error message */}
                {loginError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-300">{loginError}</p>
                  </motion.div>
                )}

                {/* Email field */}
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-300 text-sm font-medium">
                    Adresse email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    autoComplete="email"
                    disabled={loginLoading}
                    className="h-11 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-colors"
                  />
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-slate-300 text-sm font-medium">
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                      required
                      autoComplete="current-password"
                      disabled={loginLoading}
                      className="h-11 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={loginLoading || !loginForm.email || !loginForm.password}
                  className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>

              {/* Footer */}
              <div className="px-8 pb-8 pt-2 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-xs text-slate-600">ou</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                <div className="flex flex-col items-center gap-2">
                  <a
                    href="/register"
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                  >
                    Pas encore inscrit ? Créer un compte
                  </a>
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Retour à l&apos;accueil
                  </button>
                </div>

                {/* Branding */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                    <Bus className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 tracking-tight">TerangaFlow</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
