"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bus, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe incorrect.");
        toast({
          title: "Échec de la connexion",
          description: "Vérifiez vos identifiants et réessayez.",
          variant: "destructive",
        });
      } else if (result?.ok) {
        toast({
          title: "Bienvenue !",
          description: "Connexion réussie.",
        });
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Logo / Branding */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/25">
            <Bus className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              TerangaFlow
            </h1>
            <p className="text-xs text-muted-foreground">
              Intelligence des gares
            </p>
          </div>
        </div>
      </div>

      {/* Login Card */}
      <Card className="border-border/50 shadow-xl shadow-black/5">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Connexion</CardTitle>
          <CardDescription>
            Accédez à votre espace de gestion
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-2">
            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {error}
              </motion.div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@terangaflow.app"
                autoComplete="email"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  href="#"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Demo credentials hint */}
            <div className="rounded-lg bg-muted/50 border border-border/50 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                🔑 Compte de démonstration
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">admin@terangaflow.app</span>
                <br />
                <span className="font-mono">admin123</span>
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-3 pt-2">
            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link
                href="#"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Contacter votre administrateur
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground/60 mt-6">
        © {new Date().getFullYear()} TerangaFlow — L&apos;hospitalité en plus.
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
