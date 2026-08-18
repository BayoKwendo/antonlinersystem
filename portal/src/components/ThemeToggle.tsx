import { ActionIcon, useMantineColorScheme, useComputedColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

/**
 * Light/dark toggle for the admin portal. Defaults to the OS preference
 * (MantineProvider defaultColorScheme="auto"); clicking sets an explicit choice
 * that Mantine persists to localStorage. useComputedColorScheme resolves "auto"
 * to the actual light/dark so the icon always reflects what's on screen.
 */
export function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const dark = computed === "dark";
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="lg"
      radius="xl"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setColorScheme(dark ? "light" : "dark")}
    >
      {dark ? <IconSun size={20} /> : <IconMoon size={20} />}
    </ActionIcon>
  );
}
