// Ícone e selo de IA. Sempre que a tela mostra algo escrito por modelo de
// linguagem, esta marca precisa estar junto — o médico tem que conseguir
// distinguir num relance o que é dado do consultório e o que é sugestão.

export function RobotIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
      <path d="M9 13v2M15 13v2" />
      <path d="M2 14h2M20 14h2" />
    </svg>
  );
}

export function AiBadge() {
  return (
    <span className="ai-badge">
      <RobotIcon size={11} /> IA
    </span>
  );
}
