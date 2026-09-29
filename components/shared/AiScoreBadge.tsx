import { Badge } from "@/components/ui/badge";

function bandFor(score: number | null): { label: "success" | "warning" | "destructive" | "secondary" } {
  if (score == null) return { label: "secondary" };
  if (score >= 65) return { label: "success" };
  if (score >= 40) return { label: "warning" };
  return { label: "destructive" };
}

export default function AiScoreBadge({ score }: { score: number | null }) {
  const { label } = bandFor(score);
  return <Badge variant={label}>{score == null ? "—" : Math.round(score)}</Badge>;
}
