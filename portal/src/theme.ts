import { createTheme, type MantineColorsTuple } from "@mantine/core";

// SMART Drill brand — blue (mark / primary actions).
const brand: MantineColorsTuple = [
  "#e8f0fe",
  "#cddcfb",
  "#9fbcf5",
  "#6e99ef",
  "#487ce9",
  "#2f6ae6",
  "#1656c7", // primary shade
  "#134db3",
  "#0f4199",
  "#0a3480",
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
