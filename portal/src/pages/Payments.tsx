import { Badge, Button, Card, Center, Group, Loader, Modal, NumberInput, Table, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconDownload, IconReceipt } from "@tabler/icons-react";
import { useState } from "react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { PAGE_SIZE, Pager } from "../components/Pager";
import { downloadCsv } from "../lib/csv";
import { date, money } from "../lib/format";
import { sanitizePhone, validatePhoneOptional } from "../lib/validation";
import type { Payment } from "../lib/types";

export default function Payments() {
  const qc = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const payments = useQuery({
    queryKey: ["payments", page, from, to],
    queryFn: () => api.payments({ from: from || undefined, to: to || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const items = payments.data?.items ?? [];

  const form = useForm({
    initialValues: { booking_id: 0, amount: 0, receipt: "", phone: "" },
    validate: {
      booking_id: (v) => (v <= 0 ? "Required" : null),
      amount: (v) => (v <= 0 ? "Required" : null),
      receipt: (v) => (v.length < 3 ? "Required" : null),
      phone: validatePhoneOptional,
    },
  });

  const reconcile = useMutation({
    mutationFn: (v: typeof form.values) => api.reconcile(v),
    onSuccess: () => {
      notifications.show({ color: "teal", message: "Payment reconciled" });
      qc.invalidateQueries({ queryKey: ["payments"] });
      form.reset();
      close();
    },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="M-Pesa transactions"
        action={
          <Group>
            <Button variant="default" leftSection={<IconDownload size={16} />} onClick={() => downloadCsv("payments.csv", items)}>Export</Button>
            <Button leftSection={<IconReceipt size={16} />} onClick={open} variant="light">Reconcile manually</Button>
          </Group>
        }
      />
      <Group mb="md" align="flex-end">
        <TextInput type="date" label="From" value={from} onChange={(e) => { setFrom(e.currentTarget.value); setPage(1); }} />
        <TextInput type="date" label="To" value={to} onChange={(e) => { setTo(e.currentTarget.value); setPage(1); }} />
        {payments.data?.sum != null && (
          <Card withBorder radius="md" padding="sm" w="fit-content">
            <Text size="xs" c="dimmed">Total received (filtered)</Text>
            <Text fw={800} fz="lg" c="teal">{money(payments.data.sum)}</Text>
          </Card>
        )}
      </Group>
      {payments.isLoading ? <Center h={200}><Loader /></Center> : (
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Receipt</Table.Th>
                <Table.Th>Booking</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Provider</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Kind</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th>Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((p: Payment) => (
                <Table.Tr key={p.id}>
                  <Table.Td><Text ff="monospace" size="sm">{p.mpesa_receipt}</Text></Table.Td>
                  <Table.Td>#{p.booking_id}</Table.Td>
                  <Table.Td>{p.customer_name}</Table.Td>
                  <Table.Td>{p.provider_name}</Table.Td>
                  <Table.Td fw={600}>{money(p.amount)}</Table.Td>
                  <Table.Td><Badge variant="light">{p.kind}</Badge></Table.Td>
                  <Table.Td><Badge variant="outline" color="gray">{p.source}</Badge></Table.Td>
                  <Table.Td>{date(p.created_at)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      <Pager page={page} total={payments.data?.total ?? 0} onChange={setPage} />

      <Modal opened={opened} onClose={close} title="Manual reconciliation" centered>
        <form onSubmit={form.onSubmit((v) => reconcile.mutate(v))}>
          <NumberInput label="Booking ID" min={1} {...form.getInputProps("booking_id")} mb="sm" />
          <NumberInput label="Amount (KES)" min={1} {...form.getInputProps("amount")} mb="sm" />
          <TextInput label="M-Pesa receipt" {...form.getInputProps("receipt")} mb="sm" />
          <TextInput
            label="Payer phone (optional)"
            inputMode="tel"
            {...form.getInputProps("phone")}
            onChange={(e) => form.setFieldValue("phone", sanitizePhone(e.currentTarget.value))}
            mb="md"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button type="submit" loading={reconcile.isPending}>Reconcile</Button>
          </Group>
        </form>
      </Modal>
    </>
  );
}
