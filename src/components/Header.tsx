import { Link } from "react-router-dom";
import { LogOut, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";

const Header = () => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        {/* signed-in user + logout */}
        <div className="flex items-center gap-1.5 justify-self-start min-w-0">
          {user && (
            <>
              <button
                onClick={logout}
                aria-label="התנתק"
                title="התנתק"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors shrink-0"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <span className="text-xs text-muted-foreground truncate hidden sm:block">
                {user.username || user.email}
              </span>
            </>
          )}
        </div>

        <h1 className="text-xl font-semibold tracking-tight justify-self-center">
          <span className="text-secondary">Spot</span>
          <span className="text-primary">&</span>
          <span className="text-secondary">Slot</span>
        </h1>

        {/* admin console entry — admins only */}
        <div className="justify-self-end">
          {isAdmin && (
            <Link
              to="/admin"
              aria-label="לוח בקרה למנהל"
              title="לוח בקרה למנהל"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            >
              <Shield className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
