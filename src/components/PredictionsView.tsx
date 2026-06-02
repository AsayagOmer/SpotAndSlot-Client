import { useEffect, useMemo, useState, useRef } from "react";
import { format, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { Calendar, Clock, Sparkles, CloudSun, Server, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, ResponsiveContainer, ReferenceDot, YAxis } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import SmartInsights from "@/components/SmartInsights";
import { useParkingData, useLotPrediction } from "@/hooks/useParkingData";

// Realistic college parking patterns
const getCollegeOccupancyPattern = (date: Date) => {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday in Israel
  const isSunday = dayOfWeek === 0; // First day of week, typically busy
  const dateVariation = (date.getDate() % 7) - 3; // Small variation based on date

  if (isWeekend) {
    // Weekend - very low occupancy
    return {
      pattern: [5, 8, 15, 20, 18, 12, 10, 8, 6, 5, 5, 5, 5],
      hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      variation: dateVariation * 0.5
    };
  } else if (isSunday) {
    // Sunday - busiest day
    return {
      pattern: [5, 15, 45, 75, 88, 95, 92, 90, 85, 70, 50, 30, 15],
      hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      variation: dateVariation
    };
  } else {
    // Regular weekdays (Mon-Thu)
    return {
      pattern: [5, 12, 35, 65, 82, 88, 85, 80, 75, 60, 40, 25, 12],
      hours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      variation: dateVariation
    };
  }
};

// Generate chart data points
const generatePredictionData = (date: Date) => {
  const { pattern, hours, variation } = getCollegeOccupancyPattern(date);

  const timeLabels = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  return timeLabels.map((time, index) => ({
    time,
    hour: hours[index],
    value: Math.max(5, Math.min(98, pattern[index] + variation))
  }));
};

// Get predicted occupancy for a specific hour (interpolated)
const getPredictedOccupancy = (date: Date, hour: number) => {
  const { pattern, hours, variation } = getCollegeOccupancyPattern(date);

  // Handle out of bounds
  if (hour <= hours[0]) return Math.max(5, Math.min(98, pattern[0] + variation));
  if (hour >= hours[hours.length - 1]) return Math.max(5, Math.min(98, pattern[pattern.length - 1] + variation));

  // Find surrounding hours
  let index = 0;
  for (let i = 0; i < hours.length - 1; i++) {
    if (hour >= hours[i] && hour < hours[i + 1]) {
      index = i;
      break;
    }
  }

  const startHour = hours[index];
  const endHour = hours[index + 1];
  const startValue = pattern[index];
  const endValue = pattern[index + 1];

  const progress = (hour - startHour) / (endHour - startHour);
  const interpolatedBase = startValue + (endValue - startValue) * progress;

  return Math.max(5, Math.min(98, interpolatedBase + variation));
};

const timeOptions = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00"
];

const parseTimeToParts = (timeStr: string): { hours: number; minutes: number } => {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return { hours: 9, minutes: 0 };
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return { hours, minutes };
};

const parseTimeToHour = (timeStr: string): number => {
  const { hours, minutes } = parseTimeToParts(timeStr);
  return hours + (minutes / 60);
};

const formatHourToTime = (hour: number): string => {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
};

const getTimeOptionDate = (date: Date, timeStr: string): Date => {
  const { hours, minutes } = parseTimeToParts(timeStr);
  const optionDate = new Date(date);
  optionDate.setHours(hours, minutes, 0, 0);
  return optionDate;
};

const PredictionsView = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  // Target hour derived from selection
  const targetHour = parseTimeToHour(selectedTime);

  // Animated hour state
  const [animatedHour, setAnimatedHour] = useState(targetHour);

  // Animation loop
  useEffect(() => {
    // If we are very close to target, just snap
    if (Math.abs(animatedHour - targetHour) < 0.005) {
      if (animatedHour !== targetHour) {
        setAnimatedHour(targetHour);
      }
      return;
    }

    let animationFrameId: number;

    const animate = () => {
      setAnimatedHour(prev => {
        const diff = targetHour - prev;

        // Snap if close enough to avoid endless micro-updates
        if (Math.abs(diff) < 0.005) {
          return targetHour;
        }

        // Smooth easing (adjust 0.15 for speed)
        return prev + diff * 0.15;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [targetHour, animatedHour]);

  // ── Live API-backed prediction ──
  const { data: parking } = useParkingData(10000);
  const lotId = parking?.lotId ?? null;
  const targetIso = useMemo(
    () => getTimeOptionDate(selectedDate, selectedTime).toISOString(),
    [selectedDate, selectedTime],
  );
  const { data: serverPrediction, isFetching: predLoading } = useLotPrediction(lotId, targetIso);

  const occupancyData = useMemo(() =>
    generatePredictionData(selectedDate),
    [selectedDate]
  );

  // Calculate interpolated occupancy for the animated hour
  const currentOccupancy = useMemo(() =>
    Math.round(getPredictedOccupancy(selectedDate, animatedHour)),
    [selectedDate, animatedHour]
  );

  // Also enable updating the displayed "Date" text based on selectedDate immediately
  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const dateDisplayText = isToday ? "היום" : format(selectedDate, "dd/MM/yyyy");

  // Helper to get current time for enabling/disabling options
  const getNow = () => new Date();

  const isTimeOptionDisabled = (time: string) =>
    isToday && getTimeOptionDate(selectedDate, time) < getNow();

  // Auto-advance if past time
  useEffect(() => {
    if (!isToday) return;
    const currentTime = getNow();
    const selectedDateTime = getTimeOptionDate(selectedDate, selectedTime);
    if (selectedDateTime >= currentTime) return;

    const nextTime = timeOptions.find(
      (time) => getTimeOptionDate(selectedDate, time) >= currentTime
    );

    if (nextTime) {
      setSelectedTime(nextTime);
      return;
    }

    setSelectedDate(addDays(selectedDate, 1));
    setSelectedTime(timeOptions[0]);
  }, [isToday, selectedDate, selectedTime]);

  // Determine blur amount based on velocity (distance to target)
  const velocity = Math.abs(targetHour - animatedHour);
  const isMoving = velocity > 0.01;
  const blurAmount = Math.min(4, velocity * 20); // Cap blur

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Title Section */}
      <div className="text-right">
        <h2 className="text-2xl font-bold">תחזיות תפוסה</h2>
        <p className="text-muted-foreground mt-1">תכנן את ההגעה שלך לחניון</p>
      </div>

      {/* Live prediction from the Smart Parking API */}
      {lotId && (
        <div className="card-elevated p-4 flex items-center justify-between border-2 border-primary/20 animate-fade-in">
          <div className="flex items-center gap-2 text-primary">
            {predLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Server className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">תחזית מהשרת</span>
          </div>
          <div className="text-right">
            {serverPrediction ? (
              <>
                <span className="text-2xl font-bold tabular-nums">
                  {serverPrediction.predictedFreeSlots}
                </span>
                <span className="text-sm text-muted-foreground"> מקומות פנויים צפויים</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">אין נתון מהשרת</span>
            )}
          </div>
        </div>
      )}

      {/* Date/Time Selectors */}
      <div className="flex gap-3">
        {/* Time Picker */}
        <Popover open={timeOpen} onOpenChange={setTimeOpen}>
          <PopoverTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-2 bg-card rounded-2xl py-3 px-4 border border-border hover:border-primary/30 transition-colors">
              <span className="text-base font-medium">{selectedTime}</span>
              <Clock className="w-4 h-4 text-primary" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 max-h-64 overflow-y-auto" align="start">
            <div className="flex flex-col gap-1">
              {timeOptions.map((time) => (
                <button
                  key={time}
                  disabled={isTimeOptionDisabled(time)}
                  onClick={() => {
                    if (isTimeOptionDisabled(time)) return;
                    setSelectedTime(time);
                    setTimeOpen(false);
                  }}
                  className={cn(
                    "text-base py-2 px-3 rounded-lg text-right transition-colors",
                    isTimeOptionDisabled(time)
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-muted",
                    selectedTime === time
                      ? "bg-primary text-primary-foreground"
                      : ""
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Date Picker */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-2 bg-card rounded-2xl py-3 px-4 border border-border hover:border-primary/30 transition-colors">
              <span className="text-base font-medium">{dateDisplayText}</span>
              <Calendar className="w-4 h-4 text-primary" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setDateOpen(false);
                }
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Prediction Card */}
      <div className="card-elevated p-5 transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="text-right">
            <h3 className="font-bold text-lg">תפוסה צפויה</h3>
          </div>
          <div className="text-left">
            <span className="text-5xl font-bold text-primary tabular-nums">
              {currentOccupancy}%
            </span>
            <p className="text-sm text-muted-foreground mt-1">צפוי</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={occupancyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <filter id="blurFilter">
                  <feGaussianBlur in="SourceGraphic" stdDeviation={blurAmount} />
                </filter>
              </defs>
              <XAxis
                dataKey="hour"
                type="number"
                domain={[6, 18]}
                allowDataOverflow={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(val) => `${val < 10 ? '0' : ''}${val}:00`}
                ticks={[6, 8, 10, 12, 14, 16, 18]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="url(#predictionGradient)"
                animationDuration={500}
              />
              {/* Animated Reference Dot */}
              <ReferenceDot
                x={animatedHour}
                y={currentOccupancy}
                r={8}
                fill="hsl(var(--primary))"
                stroke="hsl(var(--card))"
                strokeWidth={3}
                style={{
                  filter: isMoving ? "url(#blurFilter)" : "none",
                  transition: "none" // We handle animation via JS
                }}
                isFront
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Peak info */}
        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>
            שעה נבחרת: {formatHourToTime(animatedHour)} - תפוסה צפויה: {currentOccupancy}%
          </span>
        </div>
      </div>

      {/* Best Time Cards */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground">זמן מומלץ להגעה</h3>

        <div className="card-elevated p-4 flex items-center gap-4 border-2 border-primary/20">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 text-right">
            <h4 className="font-semibold text-base">לפני 08:45</h4>
            <p className="text-sm text-muted-foreground">{Math.max(0, 100 - currentOccupancy)}% סיכוי למצוא חנייה מהר</p>
          </div>
        </div>

        <div className="card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <CloudSun className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1 text-right">
            <h4 className="font-semibold text-base">אחרי 15:30</h4>
            <p className="text-sm text-muted-foreground">מקומות מתפנים לקראת שיעורי ערב</p>
          </div>
        </div>
      </div>

      <SmartInsights />
    </div>
  );
};

export default PredictionsView;
