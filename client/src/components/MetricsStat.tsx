interface MetricsStatProps {
  value: string;
  label: string;
}

export function MetricsStat({ value, label }: MetricsStatProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-3xl md:text-4xl font-bold text-foreground" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
        {value}
      </div>
      <div className="text-sm md:text-base text-muted-foreground mt-1" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
        {label}
      </div>
    </div>
  );
}
