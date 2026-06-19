import { Badge, Button, Center, Group, Loader, Select, Table, Text, TextInput } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { PAGE_SIZE, Pager } from "../components/Pager";
import { date, money, statusColor, titleCase } from "../lib/format";
import type { Booking } from "../lib/types";

const STATUSES = ["pending_payment", "booked", "en_route", "arrived", "in_progress", "completed", "cancelled"];

export default function Bookings() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const bookings = useQuery({
    queryKey: ["bookings", status, from, to, page],
    queryFn: () => api.adminBookings({
      status: status ?? undefined, from: from || undefined, to: to || undefined,
      limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
    }),
  });
  const items = bookings.data?.items ?? [];

  const cancel = useMutation({
    mutationFn: (id: number) => api.cancelBooking(id),
    onSuccess: () => { notifications.show({ color: "teal", message: "Booking cancelled" }); qc.invalidateQueries({ queryKey: ["bookings"] }); },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  return (
    <>
      <PageHeader title="Bookings" subtitle="Service requests and their lifecycle" />
      <Group mb="md" align="flex-end">
        <Select placeholder="All statuses" clearable data={STATUSES.map((s) => ({ value: s, label: titleCase(s) }))}
          value={status} onChange={(v) => { setStatus(v); setPage(1); }} w={200} />
        <TextInput type="date" label="From" value={from} onChange={(e) => { setFrom(e.currentTarget.value); setPage(1); }} />
        <TextInput type="date" label="To" value={to} onChange={(e) => { setTo(e.currentTarget.value); setPage(1); }} />
      </Group>

      {bookings.isLoading ? <Center h={200}><Loader /></Center> : (
        <Table.ScrollContainer minWidth={900}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th><Table.Th>Customer</Table.Th><Table.Th>Provider</Table.Th>
                <Table.Th>Category</Table.Th><Table.Th>Status</Table.Th><Table.Th>Paid / Total</Table.Th>
                <Table.Th>Created</Table.Th><Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((b: Booking) => (
                <Table.Tr key={b.id}>
                  <Table.Td>{b.id}</Table.Td>
                  <Table.Td><Text fw={600} size="sm">{b.customer_name}</Text><Text size="xs" c="dimmed">{b.customer_phone}</Text></Table.Td>
                  <Table.Td><Text fw={600} size="sm">{b.provider_name}</Text><Text size="xs" c="dimmed">{b.provider_phone}</Text></Table.Td>
                  <Table.Td>{titleCase(b.category ?? "")}</Table.Td>
                  <Table.Td><Badge color={statusColor(b.status)} variant="light">{titleCase(b.status)}</Badge></Table.Td>
                  <Table.Td>{money(b.amount_paid)} / {money(b.total_amount)}</Table.Td>
                  <Table.Td>{date(b.created_at)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Button component={Link} to={`/bookings/${b.id}`} size="xs" variant="light">View</Button>
                      {["pending_payment", "booked"].includes(b.status) && (
                        <Button size="xs" variant="light" color="red" loading={cancel.isPending} onClick={() => cancel.mutate(b.id)}>Cancel</Button>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {!bookings.isLoading && items.length === 0 && <Group justify="center" mt="xl"><Text c="dimmed">No bookings</Text></Group>}
      <Pager page={page} total={bookings.data?.total ?? 0} onChange={setPage} />
    </>
  );
}
