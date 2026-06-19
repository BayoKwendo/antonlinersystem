import { createTheme, type MantineColorsTuple } from "@mantine/core";

// AntonLiner brand — rust orange (mark / primary actions).
const brand: MantineColorsTuple = [
  "#fff0e8",
  "#ffd8c4",
  "#f4b095",
  "#ec8a64",
  "#e56a3b",
  "#e25620",
  "#e14d16", // primary shade
  "#c8410d",
  "#b2390a",
  "#9a2e03",
];

// Dark slate-teal (the wordmark / headings / sidebar ink).
const ink: MantineColorsTuple = [
  "#eef4f5",
  "#dde8ea",
  "#bcd0d4",
  "#99b8bd",
  "#7ca3aa",
  "#6a969e",
  "#5f9099",
  "#2b4d55",
  "#1c3a42",
  "#0e2a31",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 5 },
  colors: { brand, ink },
  defaultRadius: "md",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  headings: { fontWeight: "700" },
});
