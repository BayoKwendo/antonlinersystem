import { Card, Group, Progress, SimpleGrid, Stack, Text } from "@mantine/core";
import { AreaChart, BarChart } from "@mantine/charts";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/endpoints";
import { PageHeader } from "../components/PageHeader";
import { money } from "../lib/format";

function Kpi({ label, value, color = "brand" }: { label: string; value: string; color?: string }) {
  return (
    <Card withBorder radius="md" padding="md">
      <Text c="dimmed" size="xs" tt="uppercase" fw={600}>{label}</Text>
      <Text fz={26} fw={800} mt={4} c={`${color}.7`}>{value}</Text>
    </Card>
  );
}

export default function Reports() {
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => api.overview() });
  const analytics = useQuery({ queryKey: ["analytics"], queryFn: api.analytics });
  const a = analytics.data;
  const c = overview.data?.counters;

  return (
    <>
      <PageHeader title="Reports" subtitle="Financial and service-delivery performance." />
      <Stack gap="lg">
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
          <Kpi label="Total payments received" value={money(c?.received_total ?? 0)} color="teal" />
          <Kpi label="Outstanding (awaiting payment)" value={money(c?.awaiting_payment_amount ?? 0)} color="yellow" />
          <Kpi label="Provider payments due" value={money(c?.payouts_due ?? 0)} color="orange" />
          <Kpi label="Active jobs" value={String(c?.active_jobs ?? 0)} color="indigo" />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Card withBorder radius="md" padding="md">
            <Text fw={700} mb="sm">Revenue — last 30 days</Text>
            {a?.revenue_by_day?.length
              ? <AreaChart h={240} data={a.revenue_by_day} dataKey="day" series={[{ name: "amount", color: "brand.6" }]} curveType="monotone" withDots={false} />
              : <Text c="dimmed" size="sm">No revenue data.</Text>}
          </Card>
          <Card withBorder radius="md" padding="md">
            <Text fw={700} mb="sm">Bookings funnel</Text>
            {a?.funnel?.length
              ? <BarChart h={240} data={a.funnel} dataKey="stage" series={[{ name: "count", color: "blue.6" }]} />
              : <Text c="dimmed" size="sm">No funnel data.</Text>}
          </Card>
        </SimpleGrid>

        <Card withBorder radius="md" padding="md">
          <Text fw={700} mb="sm">Top providers by revenue</Text>
          <Stack gap="sm">
            {(a?.top_providers ?? []).map((p, i) => {
              const max = Math.max(...(a?.top_providers ?? []).map((x) => Number(x.revenue)), 1);
              return (
                <div key={i}>
                  <Group justify="space-between" mb={2}><Text size="sm">{p.display_name}</Text><Text size="sm" fw={600}>{money(p.revenue)}</Text></Group>
                  <Progress value={(Number(p.revenue) / max) * 100} color="brand" size="sm" radius="xl" />
                </div>
              );
            })}
            {!a?.top_providers?.length && <Text c="dimmed" size="sm">No provider revenue yet.</Text>}
          </Stack>
        </Card>
      </Stack>
    </>
  );
}
