import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, Loader2, ParkingSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`ברוך הבא, ${user.username || user.email}!`, { position: "top-center" });
      // admins land on their console; everyone else on the live map.
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      navigate(user.role === "ADMIN" ? from ?? "/admin" : from ?? "/", { replace: true });
    } catch {
      toast.error("התחברות נכשלה — בדוק אימייל וסיסמה", { position: "top-center" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <ParkingSquare className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-secondary">Spot</span>
            <span className="text-primary">&</span>
            <span className="text-secondary">Slot</span>
          </h1>
          <p className="text-sm text-muted-foreground">התחבר כדי לצפות בחניונים בזמן אמת</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card-elevated p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <LogIn className="w-4 h-4 ml-2" />}
            התחבר
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          אין לך חשבון?{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            הירשם עכשיו
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
