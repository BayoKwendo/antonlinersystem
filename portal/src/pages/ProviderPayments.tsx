import { useState } from "react";
import { Badge, Button, Card, Group, Modal, Select, Stack, Table, Text, TextInput } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { money, date, titleCase } from "../lib/format";
import type { PayoutRow } from "../lib/types";

const STATUS_COLOR: Record<string, string> = { held: "gray", released: "yellow", paid: "teal" };
const KIND_LABEL: Record<string, string> = { advance: "Down payment", final: "Final balance" };
const TABS = [
  { label: "Released (due)", value: "released" },
  { label: "Held", value: "held" },
  { label: "Paid", value: "paid" },
  { label: "All", value: "all" },
];

export default function ProviderPayments() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("released");
  const [payFor, setPayFor] = useState<PayoutRow | null>(null);
  const [ref, setRef] = useState("");

  const q = useQuery({ queryKey: ["payouts", status], queryFn: () => api.adminPayouts({ status: status === "all" ? undefined : status }) });
  const due = useQuery({ queryKey: ["payouts", "released"], queryFn: () => api.adminPayouts({ status: "released" }) });
  const dueTotal = (due.data ?? []).reduce((s, p) => s + Number(p.amount), 0);

  const markPaid = useMutation({
    mutationFn: () => api.markPayoutPaid(payFor!.id, ref.trim() || undefined),
    onSuccess: () => {
      notifications.show({ color: "teal", message: "Payout marked as paid." });
      qc.invalidateQueries({ queryKey: ["payouts"] }); qc.invalidateQueries({ queryKey: ["overview"] });
      setPayFor(null); setRef("");
    },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  return (
    <>
      <PageHeader title="Provider Payments" subtitle="Payouts release automatically (down payment on arrival, balance after QA). Mark released payouts as paid once disbursed." />

      <Card withBorder radius="md" padding="md" mb="md" bg="var(--mantine-color-orange-0)">
        <Group justify="space-between"><Text fw={600}>Currently due to providers</Text><Text fz={24} fw={800} c="orange.7">{money(dueTotal)}</Text></Group>
      </Card>

      <Group mb="md"><Select data={TABS} value={status} onChange={(v) => setStatus(v ?? "released")} allowDeselect={false} w={220} /></Group>

      <Card withBorder radius="md" padding={0}>
        <Table.ScrollContainer minWidth={760}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr><Table.Th>Request</Table.Th><Table.Th>Provider</Table.Th><Table.Th>Type</Table.Th><Table.Th ta="right">Amount</Table.Th><Table.Th>Status</Table.Th><Table.Th>Ref</Table.Th><Table.Th /></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {q.data?.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td><Text size="sm" fw={600}>{p.request_no ?? `#${p.id}`}</Text><Text size="xs" c="dimmed">{date(p.created_at)}</Text></Table.Td>
                  <Table.Td><Text size="sm">{p.provider_name ?? "—"}</Text><Text size="xs" c="dimmed">{p.provider_phone ?? ""}</Text></Table.Td>
                  <Table.Td>{KIND_LABEL[p.kind] ?? titleCase(p.kind)}</Table.Td>
                  <Table.Td ta="right">{money(p.amount)}</Table.Td>
                  <Table.Td><Badge color={STATUS_COLOR[p.status] ?? "gray"} variant="light" size="sm">{p.status}</Badge></Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">{p.paid_ref ?? "—"}</Text></Table.Td>
                  <Table.Td>{p.status === "released" && <Button size="xs" variant="light" onClick={() => { setPayFor(p); setRef(""); }}>Mark paid</Button>}</Table.Td>
                </Table.Tr>
              ))}
              {q.data && !q.data.length && <Table.Tr><Table.Td colSpan={7}><Text c="dimmed" ta="center" py="md">No payouts.</Text></Table.Td></Table.Tr>}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal opened={!!payFor} onClose={() => setPayFor(null)} title={`Mark payout paid — ${payFor?.request_no ?? ""}`} centered>
        <Stack>
          <Text size="sm">{KIND_LABEL[payFor?.kind ?? ""]} of <b>{money(payFor?.amount ?? 0)}</b> to <b>{payFor?.provider_name}</b>.</Text>
          <TextInput label="Payment reference (M-Pesa / bank)" placeholder="e.g. QGH7X8Y9Z0" value={ref} onChange={(e) => setRef(e.currentTarget.value)} />
          <Group justify="flex-end"><Button color="teal" loading={markPaid.isPending} onClick={() => markPaid.mutate()}>Confirm paid</Button></Group>
        </Stack>
      </Modal>
    </>
  );
}
