import { TrendingUp } from "lucide-react";




const SmartInsights = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Section Header */}
      <h3 className="font-semibold text-sm text-muted-foreground mb-2">מגמת תפוסה</h3>



      {/* Trend Card */}
      <div className="card-elevated p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 text-right">
          <p className="text-sm text-muted-foreground">מגמת תפוסה</p>
          <p className="font-semibold">צפויה עלייה של 12% עד הצהריים</p>
        </div>
      </div>
    </div>
  );
};

export default SmartInsights;
