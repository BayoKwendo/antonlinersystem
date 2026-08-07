import { useState } from "react";
import {
  ActionIcon, Badge, Button, Card, Group, Menu, Modal, NumberInput, Select, Stack, Table, Text,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { IconDots, IconUserPlus, IconFileInvoice, IconCoin, IconCheck } from "@tabler/icons-react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { money, date, titleCase, statusColor } from "../lib/format";
import type { RequestRow } from "../lib/types";

const TABS = [
  { label: "New", value: "submitted" },
  { label: "Quoted", value: "quoted" },
  { label: "Awaiting Payment", value: "pending_payment" },
  { label: "Active", value: "booked" },
  { label: "All", value: "all" },
];

export default function CustomerRequests() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("submitted");
  const [assignFor, setAssignFor] = useState<RequestRow | null>(null);
  const [quoteFor, setQuoteFor] = useState<RequestRow | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [quote, setQuote] = useState<number | string>("");

  const q = useQuery({
    queryKey: ["admin-requests", status],
    queryFn: () => api.adminRequests({ status: status === "all" ? undefined : status }),
  });

  // providers eligible for the request being assigned (verified, same category)
  const providers = useQuery({
    queryKey: ["providers-for", assignFor?.category],
    queryFn: () => api.providers({ category: assignFor!.category, limit: 100 }),
    enabled: !!assignFor,
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-requests"] }); qc.invalidateQueries({ queryKey: ["overview"] }); };
  const done = (msg: string) => { notifications.show({ color: "teal", message: msg }); refresh(); };
  const fail = (e: unknown) => notifications.show({ color: "red", message: apiError(e) });

  const assign = useMutation({
    mutationFn: () => api.assignProvider(assignFor!.id, Number(providerId)),
    onSuccess: () => { done("Provider assigned."); setAssignFor(null); setProviderId(null); },
    onError: fail,
  });
  const setQuoteM = useMutation({
    mutationFn: () => api.setQuote(quoteFor!.id, Number(quote)),
    onSuccess: () => { done("Quote set — customer can now be invoiced."); setQuoteFor(null); setQuote(""); },
    onError: fail,
  });
  const invoice = useMutation({ mutationFn: (id: number) => api.issueInvoice(id), onSuccess: () => done("Invoice issued."), onError: fail });
  const confirmPay = useMutation({ mutationFn: (id: number) => api.confirmRequestPayment(id), onSuccess: () => done("Payment confirmed."), onError: fail });

  const fee = (r: RequestRow) => money(Number(r.quoted_amount) || Number(r.total_amount) || 0);

  return (
    <>
      <PageHeader title="Customer Requests" subtitle="Incoming requests — monitor matching and intervene: assign, quote, invoice, confirm payment." />
      <Group mb="md"><Select data={TABS} value={status} onChange={(v) => setStatus(v ?? "submitted")} allowDeselect={false} w={220} /></Group>

      <Card withBorder radius="md" padding={0}>
        <Table.ScrollContainer minWidth={840}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr><Table.Th>Request</Table.Th><Table.Th>Customer</Table.Th><Table.Th>Service</Table.Th><Table.Th>Provider</Table.Th><Table.Th ta="right">Fee</Table.Th><Table.Th>Status</Table.Th><Table.Th /></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {q.data?.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td><Text fw={600} size="sm">{r.request_no ?? `#${r.id}`}</Text><Text size="xs" c="dimmed">{date(r.created_at)}</Text></Table.Td>
                  <Table.Td><Text size="sm">{r.customer_name}</Text><Text size="xs" c="dimmed">{r.customer_phone ?? ""}</Text></Table.Td>
                  <Table.Td>{r.service_name}</Table.Td>
                  <Table.Td>{r.provider_name ?? <Text size="xs" c="dimmed">unassigned</Text>}</Table.Td>
                  <Table.Td ta="right">{fee(r)}</Table.Td>
                  <Table.Td><Badge color={statusColor(r.status)} variant="light" size="sm">{titleCase(r.status)}</Badge></Table.Td>
                  <Table.Td>
                    <Menu withinPortal position="bottom-end">
                      <Menu.Target><ActionIcon variant="subtle" color="gray"><IconDots size={18} /></ActionIcon></Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<IconUserPlus size={15} />} onClick={() => { setAssignFor(r); setProviderId(null); }}>Assign / reassign provider</Menu.Item>
                        {r.pricing_mode === "quote" && <Menu.Item leftSection={<IconCoin size={15} />} onClick={() => { setQuoteFor(r); setQuote(Number(r.quoted_amount) || ""); }}>Set quote</Menu.Item>}
                        <Menu.Item leftSection={<IconFileInvoice size={15} />} onClick={() => invoice.mutate(r.id)}>Issue invoice</Menu.Item>
                        <Menu.Item leftSection={<IconCheck size={15} />} color="teal" onClick={() => confirmPay.mutate(r.id)}>Confirm payment</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
              {q.data && !q.data.length && <Table.Tr><Table.Td colSpan={7}><Text c="dimmed" ta="center" py="md">No requests.</Text></Table.Td></Table.Tr>}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      {/* Assign modal */}
      <Modal opened={!!assignFor} onClose={() => setAssignFor(null)} title={`Assign provider — ${assignFor?.request_no ?? ""}`} centered>
        <Stack>
          <Text size="sm" c="dimmed">Verified {assignFor?.service_name} providers:</Text>
          <Select
            placeholder={providers.isLoading ? "Loading…" : "Select a provider"}
            data={(providers.data?.items ?? []).map((p) => ({ value: String(p.id), label: `${p.display_name}${p.code ? ` · ${p.code}` : ""}` }))}
            value={providerId} onChange={setProviderId} searchable
          />
          <Group justify="flex-end"><Button disabled={!providerId} loading={assign.isPending} onClick={() => assign.mutate()}>Assign</Button></Group>
        </Stack>
      </Modal>

      {/* Quote modal */}
      <Modal opened={!!quoteFor} onClose={() => setQuoteFor(null)} title={`Set quote — ${quoteFor?.request_no ?? ""}`} centered>
        <Stack>
          <NumberInput label="Quote amount (KES)" value={quote} onChange={setQuote} min={0} thousandSeparator="," prefix="KES " />
          <Group justify="flex-end"><Button disabled={!quote} loading={setQuoteM.isPending} onClick={() => setQuoteM.mutate()}>Save quote</Button></Group>
        </Stack>
      </Modal>
    </>
  );
}
