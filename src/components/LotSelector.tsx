import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSelectedLot } from "@/lib/selectedLot";

// Lets the user choose which parking lot to view; hidden when only one exists.
const LotSelector = () => {
  const { lots, selectedLotId, setSelectedLotId } = useSelectedLot();

  if (lots.length <= 1) return null;

  return (
    <Select value={selectedLotId ?? undefined} onValueChange={setSelectedLotId}>
      <SelectTrigger className="w-full bg-card rounded-2xl h-12 border-border hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <SelectValue placeholder="בחר חניון" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {lots.map((lot) => {
          const id = lot.id?.objectId ?? "";
          const city = (lot.objectDetails as { address?: string } | undefined)?.address;
          return (
            <SelectItem key={id} value={id}>
              {lot.alias ?? "חניון"}
              {city ? ` · ${city}` : ""}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default LotSelector;
