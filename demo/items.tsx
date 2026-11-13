import type { TransformMarqueeItem } from "transform-marquee";
import * as I from "./icons";

export const items: TransformMarqueeItem[] = [
  { from: "Rough idea", to: "Production-ready product", fromIcon: <I.Bulb />, toIcon: <I.Rocket /> },
  { from: "Slow experience", to: "Lightning-fast UX", fromIcon: <I.Clock />, toIcon: <I.Bolt /> },
  { from: "Buggy code", to: "Reliable software", fromIcon: <I.Alert />, toIcon: <I.Check /> },
  { from: "Guesswork", to: "Data-driven decisions", fromIcon: <I.Question />, toIcon: <I.Chart /> },
  { from: "Static mockup", to: "Interactive experience", fromIcon: <I.Swatch />, toIcon: <I.Cursor /> },
  { from: "Local demo", to: "Live deployment", fromIcon: <I.Monitor />, toIcon: <I.Globe /> },
  { from: "Security gaps", to: "Hardened application", fromIcon: <I.Alert />, toIcon: <I.Shield /> },
  { from: "Spaghetti code", to: "Clean architecture", fromIcon: <I.Puzzle />, toIcon: <I.Grid /> },
  { from: "Desktop-only UI", to: "Responsive everywhere", fromIcon: <I.Monitor />, toIcon: <I.Phone /> },
  { from: "Cluttered UI", to: "Clean design", fromIcon: <I.Swatch />, toIcon: <I.Sparkles /> },
  { from: "Siloed teams", to: "Seamless collaboration", fromIcon: <I.Question />, toIcon: <I.Users /> },
  { from: "No tests", to: "Confident releases", fromIcon: <I.Alert />, toIcon: <I.Check /> },
];

export const plainItems: TransformMarqueeItem[] = items.map(({ from, to }) => ({ from, to }));
