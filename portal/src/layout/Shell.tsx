import { AppShell, Avatar, Burger, Group, Menu, NavLink, ScrollArea, Text, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBuildingFactory2,
  IconCalendarStats,
  IconCash,
  IconCategory,
  IconGauge,
  IconHistory,
  IconLogout,
  IconMessageReport,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";
import { NavLink as RouterLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import type { Role } from "../lib/types";

interface NavItem {
  label: string;
  to: string;
  icon: typeof IconGauge;
  roles?: Role[]; // visible to these roles (undefined = all authenticated)
}

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/", icon: IconGauge },
  { label: "Providers", to: "/providers", icon: IconBuildingFactory2, roles: ["admin", "assistance", "owner"] },
  { label: "Bookings", to: "/bookings", icon: IconCalendarStats },
  { label: "Customers", to: "/customers", icon: IconUsers, roles: ["admin", "assistance"] },
  { label: "Payments", to: "/payments", icon: IconCash, roles: ["admin", "finance"] },
  { label: "Services", to: "/services", icon: IconCategory, roles: ["admin"] },
  { label: "Reviews", to: "/reviews", icon: IconStar, roles: ["admin", "assistance"] },
  { label: "Complaints", to: "/complaints", icon: IconMessageReport, roles: ["admin", "assistance"] },
  { label: "Audit log", to: "/audit", icon: IconHistory, roles: ["admin"] },
];

export default function Shell() {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = NAV.filter((n) => !n.roles || hasRole(...n.roles));

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4} c="brand.8">AntonLiner</Title>
            <Text size="xs" c="dimmed" visibleFrom="sm">Smart Drilling Portal</Text>
          </Group>
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar color="brand" radius="xl" size={32}>
                    {user?.display_name?.[0]?.toUpperCase() ?? "U"}
                  </Avatar>
                  <div style={{ lineHeight: 1.1 }}>
                    <Text size="sm" fw={600}>{user?.display_name}</Text>
                    <Text size="xs" c="dimmed">{user?.roles.join(", ")}</Text>
                  </div>
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={16} />}
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
              >
                Log out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <ScrollArea>
          {items.map((n) => (
            <NavLink
              key={n.to}
              component={RouterLink}
              to={n.to}
              label={n.label}
              leftSection={<n.icon size={18} stroke={1.6} />}
              active={location.pathname === n.to}
              variant="filled"
              mb={4}
            />
          ))}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
