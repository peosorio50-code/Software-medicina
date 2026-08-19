export function Brand({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div className="brand">
      <div className={`brand-mark${size === "sm" ? " sm" : ""}`}>M</div>
      <div className="brand-name">Meu Consultório</div>
    </div>
  );
}
