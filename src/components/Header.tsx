import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <div />
        <h1 className="text-xl font-semibold tracking-tight justify-self-center">
          <span className="text-secondary">Spot</span>
          <span className="text-primary">&</span>
          <span className="text-secondary">Slot</span>
        </h1>
        <Link
          to="/admin"
          aria-label="לוח בקרה למנהל"
          title="לוח בקרה למנהל"
          className="justify-self-end w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
        >
          <Shield className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
};

export default Header;
