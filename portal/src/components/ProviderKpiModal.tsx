import { Badge, Button, Group, Loader, Modal, Progress, Stack, Table, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { date } from "../lib/format";
import { useAuth } from "../store/auth";

const overallColor = (v: number) => (v >= 75 ? "teal" : v >= 50 ? "yellow" : "red");

/** Admin view of a provider's automatic KPI rating: aggregate + per-KPI bars +
 *  per-job breakdown, with an admin/owner "Reset ratings" action. */
export function ProviderKpiModal({ userId, name, opened, onClose }: {
  userId: number | null; name?: string; opened: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const kpi = useQuery({
    queryKey: ["provider-kpi", userId],
    queryFn: () => api.providerKpi(userId as number),
    enabled: opened && userId != null,
  });
  const reset = useMutation({
    mutationFn: () => api.resetRating(userId as number),
    onSuccess: () => {
      notifications.show({ color: "orange", message: "Provider ratings reset." });
      qc.invalidateQueries({ queryKey: ["provider-kpi", userId] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  const s = kpi.data?.summary;
  const w = kpi.data?.weights;
  const bar = (label: string, pct: string | null, weight: number, color: string) => (
    <div>
      <Group justify="space-between" mb={2}>
        <Text size="sm">{label} <Text span c="dimmed" size="xs">({weight}%)</Text></Text>
        <Text size="sm" fw={600}>{pct ?? "—"}%</Text>
      </Group>
      <Progress value={Number(pct) || 0} color={color} size="sm" radius="xl" />
    </div>
  );

  return (
    <Modal opened={opened} onClose={onClose} title={`Performance rating — ${name ?? ""}`} size="xl" centered>
      {kpi.isLoading ? <Group justify="center" py="lg"><Loader /></Group> : !kpi.data ? <Text c="dimmed">No data.</Text> : (
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text fz={34} fw={800} lh={1}>{s?.kpi_avg ?? "—"}<Text span c="dimmed" fz="sm"> / 100</Text></Text>
              <Text size="xs" c="dimmed">{s?.jobs ?? 0} rated {Number(s?.jobs) === 1 ? "job" : "jobs"} · automatic KPI score</Text>
            </div>
            {hasRole("admin", "owner") && (
              <Button color="red" variant="light" loading={reset.isPending} onClick={() => reset.mutate()}>Reset ratings</Button>
            )}
          </Group>

          <Stack gap="xs">
            {bar("Acceptance speed", s?.acceptance ?? null, w?.acceptance ?? 10, "blue")}
            {bar("Customer contact speed", s?.contact ?? null, w?.contact ?? 20, "indigo")}
            {bar("Arrival at site", s?.arrival ?? null, w?.arrival ?? 40, "grape")}
            {bar("Job completion time", s?.completion ?? null, w?.completion ?? 10, "teal")}
            {bar("Customer feedback", s?.feedback ?? null, w?.feedback ?? 20, "yellow")}
          </Stack>

          <Text fw={700} size="sm" mt="xs">Per-job scores</Text>
          <Table.ScrollContainer minWidth={680}>
            <Table striped verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Request</Table.Th><Table.Th>Service</Table.Th>
                  <Table.Th ta="right">Accept</Table.Th><Table.Th ta="right">Contact</Table.Th>
                  <Table.Th ta="right">Arrival</Table.Th><Table.Th ta="right">Complete</Table.Th>
                  <Table.Th ta="right">Feedback</Table.Th><Table.Th ta="right">Overall</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {kpi.data.jobs.map((j) => (
                  <Table.Tr key={j.booking_id}>
                    <Table.Td><Text size="sm" fw={600}>{j.request_no ?? `#${j.booking_id}`}</Text><Text size="xs" c="dimmed">{date(j.created_at)}</Text></Table.Td>
                    <Table.Td>{j.service ?? "—"}</Table.Td>
                    <Table.Td ta="right">{j.acceptance_pct}%</Table.Td>
                    <Table.Td ta="right">{j.contact_pct}%</Table.Td>
                    <Table.Td ta="right">{j.arrival_pct}%</Table.Td>
                    <Table.Td ta="right">{j.completion_pct}%</Table.Td>
                    <Table.Td ta="right">{j.feedback_pct}%</Table.Td>
                    <Table.Td ta="right"><Badge variant="light" color={overallColor(Number(j.overall))}>{j.overall}</Badge></Table.Td>
                  </Table.Tr>
                ))}
                {!kpi.data.jobs.length && <Table.Tr><Table.Td colSpan={8}><Text c="dimmed" ta="center" py="sm">No rated jobs yet — scores appear once Ops rates a completed job.</Text></Table.Td></Table.Tr>}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      )}
    </Modal>
  );
}
