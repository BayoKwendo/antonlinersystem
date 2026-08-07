import { AppShell, Avatar, Burger, Group, Menu, NavLink, ScrollArea, Text, TextInput, Title, UnstyledButton } from "@mantine/core";
import { Logo } from "../components/Logo";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";
import {
  IconBuildingFactory2,
  IconCalendarStats,
  IconCash,
  IconCategory,
  IconGauge,
  IconHistory,
  IconInbox,
  IconLogout,
  IconMapPin,
  IconMessage,
  IconMessageReport,
  IconReportAnalytics,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconStar,
  IconUser,
  IconUsers,
  IconUsersGroup,
  IconWallet,
} from "@tabler/icons-react";
import { NavLink as RouterLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import type { Role } from "../lib/types";
import "./shell.css";

interface NavItem {
  label: string;
  to: string;
  icon: typeof IconGauge;
  roles?: Role[];
}

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/", icon: IconGauge },
  { label: "Customer Requests", to: "/requests", icon: IconInbox, roles: ["admin", "assistance", "owner"] },
  { label: "Service Providers", to: "/providers", icon: IconBuildingFactory2, roles: ["admin", "assistance", "owner"] },
  { label: "Jobs", to: "/bookings", icon: IconCalendarStats },
  { label: "Live tracking", to: "/live", icon: IconMapPin, roles: ["admin", "assistance", "finance", "owner"] },
  { label: "Customer Payments", to: "/payments", icon: IconCash, roles: ["admin", "finance"] },
  { label: "Provider Payments", to: "/provider-payments", icon: IconWallet, roles: ["admin", "finance"] },
  { label: "Quality Assurance", to: "/qa", icon: IconShieldCheck, roles: ["admin", "assistance"] },
  { label: "Ratings", to: "/reviews", icon: IconStar, roles: ["admin", "assistance"] },
  { label: "Complaints", to: "/complaints", icon: IconMessageReport, roles: ["admin", "assistance"] },
  { label: "Customers", to: "/customers", icon: IconUsers, roles: ["admin", "assistance"] },
  { label: "Reports", to: "/reports", icon: IconReportAnalytics, roles: ["admin", "assistance", "finance", "owner"] },
  { label: "Services", to: "/services", icon: IconCategory, roles: ["admin"] },
  { label: "SMS", to: "/sms", icon: IconMessage, roles: ["admin", "assistance"] },
  { label: "Admin Users", to: "/team", icon: IconUsersGroup, roles: ["admin"] },
  { label: "Audit Log", to: "/audit", icon: IconHistory, roles: ["admin"] },
  { label: "Settings", to: "/settings", icon: IconSettings, roles: ["admin"] },
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
      navbar={{ width: 264, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
      styles={{ main: { background: "light-dark(#f4f6fb, var(--mantine-color-dark-8))" } }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" gap="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={4} visibleFrom="sm">Dashboard</Title>
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder="Search requests, providers, customers…"
            style={{ flex: 1, maxWidth: 460 }}
            visibleFrom="sm"
          />
          <Text size="sm" c="dimmed" ml="auto" visibleFrom="md">{dayjs().format("ddd, DD MMM YYYY")}</Text>
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar color="brand" radius="xl" size={34}>{user?.display_name?.[0]?.toUpperCase() ?? "U"}</Avatar>
                  <div style={{ lineHeight: 1.15 }}>
                    <Text size="sm" fw={600}>{user?.display_name}</Text>
                    <Text size="xs" c="dimmed" tt="capitalize">{user?.roles?.[0] ?? ""}</Text>
                  </div>
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconUser size={16} />} onClick={() => navigate("/profile")}>My profile</Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={async () => { await logout(); navigate("/login"); }}>Log out</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="sd-navbar" p="sm">
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ padding: "6px 8px 14px" }}><Logo size="sm" onDark /></div>
          <ScrollArea style={{ flex: 1 }}>
            {items.map((n) => (
              <NavLink
                key={n.to}
                component={RouterLink}
                to={n.to}
                label={n.label}
                leftSection={<n.icon size={18} stroke={1.6} />}
                active={n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to)}
              />
            ))}
          </ScrollArea>
          <div className="sd-help" style={{ marginTop: 10 }}>
            <Text className="sd-help__title">Need Help?</Text>
            <Text className="sd-help__sub">Contact Support Team</Text>
            <Text className="sd-help__phone">0700 100 200</Text>
          </div>
        </div>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
