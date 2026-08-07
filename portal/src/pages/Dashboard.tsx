import { Badge, Card, Group, Progress, SimpleGrid, Stack, Table, Text, ThemeIcon } from "@mantine/core";
import { DonutChart } from "@mantine/charts";
import { useQuery } from "@tanstack/react-query";
import {
  IconInbox, IconCash, IconBriefcase, IconShieldCheck, IconArrowDownCircle, IconWallet,
  IconAlertTriangle, IconActivity,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { api } from "../api/endpoints";
import { PageHeader } from "../components/PageHeader";
import { money, date, titleCase, statusColor } from "../lib/format";

function Tile({ icon, color, value, label, sub }: { icon: ReactNode; color: string; value: ReactNode; label: string; sub?: ReactNode }) {
  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" align="flex-start">
        <ThemeIcon variant="light" color={color} size={40} radius="md">{icon}</ThemeIcon>
        {sub}
      </Group>
      <Text fz={28} fw={800} mt="sm" lh={1}>{value}</Text>
      <Text c="dimmed" size="sm" mt={4}>{label}</Text>
    </Card>
  );
}

const STATUS_COLORS: Record<string, string> = {
  booked: "blue", en_route: "indigo", arrived: "grape", in_progress: "violet", completed: "yellow", confirmed: "teal",
};

export default function Dashboard() {
  const { data: o, isLoading } = useQuery({ queryKey: ["overview"], queryFn: api.overview, refetchInterval: 60_000 });

  const donut = o
    ? Object.entries(o.jobs_by_status)
        .filter(([k]) => k !== "total")
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: titleCase(k), value: v as number, color: `${STATUS_COLORS[k] ?? "gray"}.6` }))
    : [];

  const ps = o?.provider_status;
  const providerStatusRows: { label: string; value: number; color: string }[] = ps
    ? [
        { label: "Available", value: ps.available, color: "teal" },
        { label: "At a Job / On Site", value: ps.on_site + ps.headed, color: "blue" },
        { label: "Scheduled (Upcoming)", value: ps.scheduled, color: "indigo" },
        { label: "Awaiting Payment", value: ps.awaiting_payment, color: "yellow" },
        { label: "On Holiday / Maintenance", value: ps.on_holiday + ps.maintenance, color: "grape" },
        { label: "Offline", value: ps.offline, color: "gray" },
        { label: "Pending verification", value: ps.pending, color: "orange" },
        { label: "Suspended", value: ps.suspended, color: "red" },
      ]
    : [];

  const received = o?.counters.received_today ?? 0;
  const yest = o?.counters.received_yesterday ?? 0;
  const deltaPct = yest > 0 ? Math.round(((received - yest) / yest) * 100) : null;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Operational overview of the SMART Drill platform" />

      {isLoading || !o ? (
        <Text c="dimmed">Loading overview…</Text>
      ) : (
        <Stack gap="lg">
          {/* headline tiles */}
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3, xl: 6 }} spacing="md">
            <Tile icon={<IconInbox size={22} />} color="blue" value={o.counters.new_requests} label="New Requests"
              sub={o.counters.new_requests_today > 0 ? <Badge color="blue" variant="light" size="sm">+{o.counters.new_requests_today} today</Badge> : undefined} />
            <Tile icon={<IconCash size={22} />} color="yellow" value={o.counters.awaiting_payment} label="Awaiting Payment"
              sub={<Text size="xs" c="dimmed">{money(o.counters.awaiting_payment_amount)}</Text>} />
            <Tile icon={<IconBriefcase size={22} />} color="indigo" value={o.counters.active_jobs} label="Active Jobs"
              sub={o.counters.active_jobs_today > 0 ? <Badge color="indigo" variant="light" size="sm">+{o.counters.active_jobs_today} today</Badge> : undefined} />
            <Tile icon={<IconShieldCheck size={22} />} color="grape" value={o.counters.awaiting_qa} label="Awaiting QA"
              sub={o.counters.awaiting_qa_today > 0 ? <Badge color="grape" variant="light" size="sm">+{o.counters.awaiting_qa_today} today</Badge> : undefined} />
            <Tile icon={<IconArrowDownCircle size={22} />} color="teal" value={money(received)} label="Payments Received (today)"
              sub={deltaPct !== null ? <Badge color={deltaPct >= 0 ? "teal" : "red"} variant="light" size="sm">{deltaPct >= 0 ? "+" : ""}{deltaPct}%</Badge> : undefined} />
            <Tile icon={<IconWallet size={22} />} color="orange" value={money(o.counters.payouts_due)} label="Provider Payments Due" />
          </SimpleGrid>

          {/* jobs by status + provider status + alerts */}
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <Card withBorder radius="md" padding="md">
              <Text fw={700} mb="sm">Jobs by Status</Text>
              {donut.length ? (
                <Group justify="center">
                  <DonutChart data={donut} size={160} thickness={26} chartLabel={o.jobs_by_status.total}
                    withTooltip tooltipDataSource="segment" />
                </Group>
              ) : <Text c="dimmed" size="sm">No active jobs.</Text>}
              <Stack gap={4} mt="sm">
                {donut.map((d) => (
                  <Group key={d.name} justify="space-between">
                    <Group gap={6}><Badge color={d.color.split(".")[0]} variant="filled" size="xs" circle style={{ width: 10, height: 10, padding: 0 }} /><Text size="sm">{d.name}</Text></Group>
                    <Text size="sm" fw={600}>{d.value}</Text>
                  </Group>
                ))}
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="md">
              <Text fw={700} mb="sm">Provider Status</Text>
              <Stack gap={8}>
                {providerStatusRows.map((r) => (
                  <Group key={r.label} justify="space-between">
                    <Group gap={8}><ThemeIcon color={r.color} size={10} radius="xl" variant="filled" /><Text size="sm">{r.label}</Text></Group>
                    <Text size="sm" fw={700}>{r.value}</Text>
                  </Group>
                ))}
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="md">
              <Group gap="xs" mb="sm"><IconAlertTriangle size={18} /><Text fw={700}>Alerts &amp; Notifications</Text></Group>
              <Stack gap="sm">
                <Alert value={o.alerts.pending_providers} color="blue" text="provider applications awaiting review" />
                <Alert value={o.alerts.delayed_jobs} color="orange" text="jobs past their scheduled time" />
                <Alert value={o.alerts.unmatched_requests} color="grape" text="new requests need matching" />
              </Stack>
            </Card>
          </SimpleGrid>

          {/* payments overview + provider performance */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Card withBorder radius="md" padding="md">
              <Text fw={700} mb="sm">Payments Overview</Text>
              <Stack gap="sm">
                <PayRow label="Awaiting customer payment" value={money(o.counters.awaiting_payment_amount)} color="yellow" />
                <PayRow label="Payments received today" value={money(o.counters.received_today)} color="teal" />
                <PayRow label="Provider payments due" value={money(o.counters.payouts_due)} color="orange" />
                <PayRow label="Total payments received" value={money(o.counters.received_total)} color="blue" strong />
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="md">
              <Text fw={700} mb="sm">Provider Performance (Top 5)</Text>
              <Table verticalSpacing="xs">
                <Table.Thead><Table.Tr><Table.Th>Provider</Table.Th><Table.Th ta="right">Jobs</Table.Th><Table.Th ta="right">Rating</Table.Th></Table.Tr></Table.Thead>
                <Table.Tbody>
                  {o.provider_performance.map((p, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{p.provider}</Table.Td>
                      <Table.Td ta="right">{p.jobs}</Table.Td>
                      <Table.Td ta="right">{p.rating != null ? <Badge color="yellow" variant="light">★ {p.rating}</Badge> : "—"}</Table.Td>
                    </Table.Tr>
                  ))}
                  {!o.provider_performance.length && <Table.Tr><Table.Td colSpan={3}><Text c="dimmed" size="sm">No providers yet.</Text></Table.Td></Table.Tr>}
                </Table.Tbody>
              </Table>
            </Card>
          </SimpleGrid>

          {/* recent requests + top services */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Card withBorder radius="md" padding="md">
              <Text fw={700} mb="sm">Recent Requests</Text>
              <Table.ScrollContainer minWidth={420}>
                <Table verticalSpacing="xs">
                  <Table.Thead><Table.Tr><Table.Th>Request</Table.Th><Table.Th>Customer</Table.Th><Table.Th>Service</Table.Th><Table.Th>Status</Table.Th></Table.Tr></Table.Thead>
                  <Table.Tbody>
                    {o.recent_requests.map((r) => (
                      <Table.Tr key={r.id}>
                        <Table.Td><Text size="sm" fw={600}>{r.request_no ?? `#${r.id}`}</Text></Table.Td>
                        <Table.Td>{r.customer}</Table.Td>
                        <Table.Td>{r.service}</Table.Td>
                        <Table.Td><Badge color={statusColor(r.status)} variant="light" size="sm">{titleCase(r.status)}</Badge></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Card>

            <Card withBorder radius="md" padding="md">
              <Text fw={700} mb="sm">Top Services (This Month)</Text>
              <Stack gap="sm">
                {o.top_services.map((s) => {
                  const max = Math.max(...o.top_services.map((x) => x.jobs), 1);
                  return (
                    <div key={s.key}>
                      <Group justify="space-between" mb={2}>
                        <Text size="sm">{s.name}</Text>
                        <Text size="sm" fw={600}>{s.jobs} · {money(s.revenue)}</Text>
                      </Group>
                      <Progress value={(s.jobs / max) * 100} color="brand" size="sm" radius="xl" />
                    </div>
                  );
                })}
                {!o.top_services.length && <Text c="dimmed" size="sm">No jobs this month.</Text>}
              </Stack>
            </Card>
          </SimpleGrid>

          {/* recent activity + QA queue */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Card withBorder radius="md" padding="md">
              <Group gap="xs" mb="sm"><IconActivity size={18} /><Text fw={700}>Recent Activity</Text></Group>
              <Stack gap="sm">
                {o.recent_activity.map((a, i) => (
                  <Group key={i} justify="space-between" wrap="nowrap">
                    <div>
                      <Text size="sm">{titleCase(a.status)} — <Text span c="dimmed">{a.service}</Text></Text>
                      <Text size="xs" c="dimmed">{a.request_no ?? ""} {a.note ? `· ${a.note}` : ""}</Text>
                    </div>
                    <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>{date(a.created_at)}</Text>
                  </Group>
                ))}
                {!o.recent_activity.length && <Text c="dimmed" size="sm">No activity yet.</Text>}
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="md">
              <Text fw={700} mb="sm">Quality Assurance Queue</Text>
              <Table.ScrollContainer minWidth={420}>
                <Table verticalSpacing="xs">
                  <Table.Thead><Table.Tr><Table.Th>Request</Table.Th><Table.Th>Service</Table.Th><Table.Th>Customer</Table.Th><Table.Th>Provider</Table.Th></Table.Tr></Table.Thead>
                  <Table.Tbody>
                    {o.qa_queue.map((r) => (
                      <Table.Tr key={r.id}>
                        <Table.Td><Text size="sm" fw={600}>{r.request_no ?? `#${r.id}`}</Text></Table.Td>
                        <Table.Td>{r.service}</Table.Td>
                        <Table.Td>{r.customer}</Table.Td>
                        <Table.Td>{r.provider ?? "—"}</Table.Td>
                      </Table.Tr>
                    ))}
                    {!o.qa_queue.length && <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" size="sm">Nothing awaiting QA.</Text></Table.Td></Table.Tr>}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Card>
          </SimpleGrid>
        </Stack>
      )}
    </>
  );
}

function Alert({ value, color, text }: { value: number; color: string; text: string }) {
  return (
    <Group gap="sm" wrap="nowrap">
      <ThemeIcon variant="light" color={color} size={30} radius="xl"><IconAlertTriangle size={16} /></ThemeIcon>
      <Text size="sm"><Text span fw={700}>{value}</Text> {text}</Text>
    </Group>
  );
}

function PayRow({ label, value, color, strong }: { label: string; value: string; color: string; strong?: boolean }) {
  return (
    <Group justify="space-between">
      <Group gap={8}><ThemeIcon color={color} size={10} radius="xl" variant="filled" /><Text size="sm">{label}</Text></Group>
      <Text size="sm" fw={strong ? 800 : 600}>{value}</Text>
    </Group>
  );
}
