import { ActionIcon, AppShell, Avatar, Burger, Group, Indicator, Menu, NavLink, ScrollArea, Text, UnstyledButton } from "@mantine/core";
import { Logo } from "../components/Logo";
import { GlobalSearch } from "../components/GlobalSearch";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";
import {
  IconBell,
  IconBuildingFactory2,
  IconCalendarStats,
  IconCalendarEvent,
  IconCash,
  IconChevronDown,
  IconCategory,
  IconGauge,
  IconHistory,
  IconInbox,
  IconLogout,
  IconMapPin,
  IconMessage,
  IconMessageReport,
  IconReportAnalytics,
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
  const ROLE_LABEL: Record<string, string> = {
    admin: "Super Admin", owner: "Owner", finance: "Finance", assistance: "Support", provider: "Provider", customer: "Customer",
  };
  const roleLabel = ROLE_LABEL[user?.roles?.[0] ?? ""] ?? (user?.roles?.[0] ?? "");

  return (
    <AppShell
      layout="alt"
      header={{ height: 64 }}
      navbar={{ width: 264, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
      styles={{ main: { background: "light-dark(#f4f6fb, var(--mantine-color-dark-8))" } }}
    >
      <AppShell.Header>
        <Group h="100%" px="lg" gap="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <GlobalSearch />
          <Group gap={7} className="sd-datepill" ml="auto" visibleFrom="md">
            <IconCalendarEvent size={15} stroke={1.8} />
            <Text size="sm" fw={500}>Today, {dayjs().format("DD MMM YYYY")}</Text>
          </Group>

          <Menu shadow="md" width={230} position="bottom-end">
            <Menu.Target>
              <Indicator color="red" size={8} offset={5} withBorder>
                <ActionIcon variant="subtle" color="gray" size="lg" radius="xl" aria-label="Notifications">
                  <IconBell size={20} />
                </ActionIcon>
              </Indicator>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Needs attention</Menu.Label>
              <Menu.Item leftSection={<IconInbox size={16} />} onClick={() => navigate("/requests")}>New customer requests</Menu.Item>
              <Menu.Item leftSection={<IconBuildingFactory2 size={16} />} onClick={() => navigate("/providers")}>Provider applications</Menu.Item>
              <Menu.Item leftSection={<IconMessageReport size={16} />} onClick={() => navigate("/complaints")}>Complaints</Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs" wrap="nowrap">
                  <Avatar color="brand" radius="xl" size={34}>{user?.display_name?.[0]?.toUpperCase() ?? "U"}</Avatar>
                  <div style={{ lineHeight: 1.15 }} className="sd-userblock">
                    <Text size="sm" fw={600}>{user?.display_name}</Text>
                    <Text size="xs" c="dimmed">{roleLabel}</Text>
                  </div>
                  <IconChevronDown size={16} stroke={1.8} color="var(--mantine-color-gray-5)" />
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
          <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 6px", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <Logo size="sm" onDark />
          </div>
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
