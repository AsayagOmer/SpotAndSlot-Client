import { useState } from "react";
import { Bell } from "lucide-react";
import Header from "@/components/Header";
import TabSwitcher from "@/components/TabSwitcher";
import ParkingLotMap from "@/components/ParkingLotMap";

import PredictionsView from "@/components/PredictionsView";

const Index = () => {
  const [activeViewTab, setActiveViewTab] = useState<"live" | "predictions">("live");

  return (
    <div className="min-h-screen bg-background pb-6">
      <Header />

      <main className="container max-w-md mx-auto px-4 pb-5 space-y-5">
        {/* Sticky Tab Switcher Container */}
        <div className="sticky top-0 z-50 py-4 -mx-4 px-4 bg-background/95 backdrop-blur-xl border-b border-border/60 shadow-md transition-all duration-300">
          <TabSwitcher activeTab={activeViewTab} onTabChange={setActiveViewTab} />
        </div>

        {/* Content based on active tab */}
        {activeViewTab === "live" ? (
          <>
            <ParkingLotMap />

            {/* Notify Button */}
            <button className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-semibold flex items-center justify-center gap-3 shadow-primary-glow hover:opacity-90 transition-opacity active:scale-[0.98]">
              <span>התראה על פינוי מקום</span>
              <Bell className="w-5 h-5" />
            </button>



          </>
        ) : (
          <PredictionsView />
        )}
      </main>
    </div>
  );
};

export default Index;
