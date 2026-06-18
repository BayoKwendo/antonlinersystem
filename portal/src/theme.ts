import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Water / drilling brand — a deep aqua-teal.
const brand: MantineColorsTuple = [
  "#e3fbfb",
  "#d3f1f1",
  "#abe0e1",
  "#7fcfd0",
  "#5cc1c2",
  "#46b8b9",
  "#36b3b4",
  "#239e9f",
  "#0c8d8e",
  "#007a7c",
];

export const theme = createTheme({
  primaryColor: "brand",
  colors: { brand },
  defaultRadius: "md",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  headings: { fontWeight: "700" },
});
