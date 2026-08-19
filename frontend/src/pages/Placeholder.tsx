interface PlaceholderProps {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
}

export function Placeholder({ title, subtitle, description, icon }: PlaceholderProps) {
  return (
    <section>
      <div className="topbar">
        <div>
          <h1>{title}</h1>
          <div className="sub">{subtitle}</div>
        </div>
      </div>
      <div className="placeholder">
        <div className="ph-icon" aria-hidden="true">
          {icon}
        </div>
        <h2>{title}</h2>
        <p>{description}</p>
        <span className="soon-badge">Próximo módulo</span>
      </div>
    </section>
  );
}
