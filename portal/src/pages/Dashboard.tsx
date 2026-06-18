import { Badge, Card, Center, Group, Loader, Progress, SimpleGrid, Stack, Text } from "@mantine/core";
import { AreaChart, BarChart } from "@mantine/charts";
import { useQuery } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconBuildingFactory2,
  IconCalendarStats,
  IconCash,
  IconUsers,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { api } from "../api/endpoints";
import { PageHeader } from "../components/PageHeader";
import { money, statusColor, titleCase } from "../lib/format";

function Stat({ label, value, icon: Icon, color = "brand" }: { label: string; value: string; icon: typeof IconUsers; color?: string }) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
        <Icon size={22} stroke={1.6} color={`var(--mantine-color-${color}-6)`} />
      </Group>
      <Text fz={30} fw={800} mt="sm">{value}</Text>
    </Card>
  );
}

export default function Dashboard() {
  const stats = useQuery({ queryKey: ["stats"], queryFn: api.stats });
  const analytics = useQuery({ queryKey: ["analytics"], queryFn: api.analytics });

  if (stats.isLoading || analytics.isLoading || !stats.data || !analytics.data) {
    return <Center h={300}><Loader /></Center>;
  }
  const s = stats.data;
  const a = analytics.data;

  const revenueData = a.revenue_by_day.map((d) => ({
    day: dayjs(d.day).format("DD MMM"),
    Revenue: Number(d.total),
  }));
  const funnelData = a.funnel.map((f) => ({ status: titleCase(f.status), Bookings: f.n }));
  const maxRevenue = Math.max(...a.top_providers.map((p) => Number(p.revenue)), 1);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Operations at a glance" />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
        <Stat label="Providers" value={String(s.providers)} icon={IconBuildingFactory2} />
        <Stat label="Customers" value={String(s.customers)} icon={IconUsers} />
        <Stat label="Active bookings" value={String(s.active_bookings)} icon={IconCalendarStats} />
        <Stat label="Revenue" value={money(s.revenue)} icon={IconCash} color="teal" />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} mb="lg">
        <Card withBorder radius="md" padding="lg">
          <Text fw={700} mb="md">Revenue — last 30 days</Text>
          {revenueData.length ? (
            <AreaChart
              h={220}
              data={revenueData}
              dataKey="day"
              series={[{ name: "Revenue", color: "brand.6" }]}
              curveType="monotone"
              withDots={false}
              valueFormatter={(v) => money(v)}
            />
          ) : <Text c="dimmed" size="sm">No payments in the last 30 days</Text>}
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Text fw={700} mb="md">Bookings funnel</Text>
          {funnelData.length ? (
            <BarChart h={220} data={funnelData} dataKey="status" series={[{ name: "Bookings", color: "blue.6" }]} />
          ) : <Text c="dimmed" size="sm">No bookings yet</Text>}
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Card withBorder radius="md" padding="lg">
          <Group gap="xs" mb="md">
            <IconAlertTriangle size={18} color="var(--mantine-color-yellow-7)" />
            <Text fw={700}>Outstanding balance</Text>
          </Group>
          <Text fz={28} fw={800} c="yellow.8">{money(a.outstanding)}</Text>
          <Text size="xs" c="dimmed">Across active (uncompleted) bookings</Text>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Text fw={700} mb="md">Top providers by revenue</Text>
          <Stack gap="sm">
            {a.top_providers.length === 0 && <Text c="dimmed" size="sm">No data</Text>}
            {a.top_providers.map((p) => (
              <div key={p.id}>
                <Group justify="space-between" mb={2}>
                  <Text size="sm" fw={600}>{p.display_name}</Text>
                  <Group gap={6}>
                    <Badge size="sm" variant="light" color={statusColor("completed")}>★ {Number(p.rating_avg).toFixed(1)}</Badge>
                    <Text size="sm">{money(p.revenue)}</Text>
                  </Group>
                </Group>
                <Progress value={(Number(p.revenue) / maxRevenue) * 100} color="brand" size="sm" radius="xl" />
              </div>
            ))}
          </Stack>
        </Card>
      </SimpleGrid>
    </>
  );
}
