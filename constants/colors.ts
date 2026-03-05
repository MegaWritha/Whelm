const TEAL = "#00C9A7";
const NAVY = "#0A0F1E";
const NAVY_CARD = "#111827";
const NAVY_SURFACE = "#1A2235";
const NAVY_BORDER = "#1E2D45";
const TEXT_PRIMARY = "#F0F4FF";
const TEXT_SECONDARY = "#8A9BBE";
const TEXT_MUTED = "#4A5C7A";
const ELECTRIC_BLUE = "#3B82F6";
const AMBER = "#F59E0B";
const ROSE = "#F43F5E";
const EMERALD = "#10B981";

export const Colors = {
  primary: TEAL,
  primaryDim: "#00C9A720",
  secondary: ELECTRIC_BLUE,
  secondaryDim: "#3B82F620",

  background: NAVY,
  surface: NAVY_CARD,
  surfaceRaised: NAVY_SURFACE,
  border: NAVY_BORDER,

  text: TEXT_PRIMARY,
  textSecondary: TEXT_SECONDARY,
  textMuted: TEXT_MUTED,

  success: EMERALD,
  warning: AMBER,
  danger: ROSE,
  info: ELECTRIC_BLUE,

  creative: "#A855F7",
  growth: ELECTRIC_BLUE,
  operations: AMBER,
  technical: EMERALD,
  strategy: ROSE,

  tabActive: TEAL,
  tabInactive: TEXT_MUTED,
};

export default {
  light: {
    text: TEXT_PRIMARY,
    background: NAVY,
    tint: TEAL,
    tabIconDefault: TEXT_MUTED,
    tabIconSelected: TEAL,
  },
  dark: {
    text: TEXT_PRIMARY,
    background: NAVY,
    tint: TEAL,
    tabIconDefault: TEXT_MUTED,
    tabIconSelected: TEAL,
  },
};
