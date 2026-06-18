import { Badge, Button, Center, Group, Loader, Modal, Select, Table, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { PAGE_SIZE, Pager } from "../components/Pager";
import { date, money, statusColor, titleCase } from "../lib/format";
import type { Complaint } from "../lib/types";

export default function Complaints() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<Complaint | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const complaints = useQuery({
    queryKey: ["complaints", page],
    queryFn: () => api.complaints({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const items = complaints.data?.items ?? [];

  const form = useForm({ initialValues: { status: "resolved", note: "" } });

  const update = useMutation({
    mutationFn: (v: { id: number; status: string; note?: string }) =>
      api.updateComplaint(v.id, { status: v.status, note: v.note }),
    onSuccess: () => {
      notifications.show({ color: "teal", message: "Complaint updated" });
      qc.invalidateQueries({ queryKey: ["complaints"] });
      close();
    },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  function edit(c: Complaint) {
    setActive(c);
    form.setValues({ status: c.status, note: c.resolution_note ?? "" });
    open();
  }

  return (
    <>
      <PageHeader title="Complaints" subtitle="Post-job reports and disputes" />
      {complaints.isLoading ? <Center h={200}><Loader /></Center> : (
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Booking</Table.Th>
                <Table.Th>Provider</Table.Th>
                <Table.Th>Message</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((c: Complaint) => (
                <Table.Tr key={c.id}>
                  <Table.Td>{c.id}</Table.Td>
                  <Table.Td>{c.booking_id ? `#${c.booking_id}` : "—"}</Table.Td>
                  <Table.Td>{c.provider_name ?? "—"}</Table.Td>
                  <Table.Td><Text size="sm" lineClamp={2} maw={320}>{c.message}</Text></Table.Td>
                  <Table.Td>{c.amount ? money(c.amount) : "—"}</Table.Td>
                  <Table.Td><Badge color={statusColor(c.status)} variant="light">{titleCase(c.status)}</Badge></Table.Td>
                  <Table.Td>{date(c.created_at)}</Table.Td>
                  <Table.Td><Button size="xs" variant="light" onClick={() => edit(c)}>Manage</Button></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      <Pager page={page} total={complaints.data?.total ?? 0} onChange={setPage} />

      <Modal opened={opened} onClose={close} title={`Complaint #${active?.id ?? ""}`} centered>
        <Text size="sm" mb="md">{active?.message}</Text>
        <form onSubmit={form.onSubmit((v) => { if (active) update.mutate({ id: active.id, ...v }); })}>
          <Select
            label="Status"
            data={[{ value: "open", label: "Open" }, { value: "resolved", label: "Resolved" }, { value: "dismissed", label: "Dismissed" }]}
            {...form.getInputProps("status")}
            mb="sm"
          />
          <Textarea label="Resolution note" autosize minRows={2} {...form.getInputProps("note")} mb="md" />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button type="submit" loading={update.isPending}>Save</Button>
          </Group>
        </form>
      </Modal>
    </>
  );
}
