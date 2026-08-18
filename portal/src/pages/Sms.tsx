import { Badge, Button, Card, Center, Group, Loader, Stack, Table, Text, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useQuery } from "@tanstack/react-query";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { PAGE_SIZE, Pager } from "../components/Pager";
import { validatePhone } from "../lib/validation";
import { PhoneInput } from "../components/PhoneInput";
import { date } from "../lib/format";
import type { SmsLog } from "../lib/types";

export default function Sms() {
  const [sending, setSending] = useState(false);
  const form = useForm({
    initialValues: { phone: "", text: "" },
    validate: {
      phone: validatePhone,
      text: (v) => (v.trim().length < 1 ? "Message is required" : v.length > 400 ? "Too long" : null),
    },
  });

  // Delivery log — staff look up an OTP/message a customer says didn't arrive.
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const logs = useQuery({
    queryKey: ["sms-logs", q, page],
    queryFn: () => api.smsLogs({ q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });

  async function send(v: typeof form.values) {
    setSending(true);
    try {
      await api.sendSms(v.phone, v.text);
      notifications.show({ color: "teal", message: "SMS sent" });
      form.setFieldValue("text", "");
      logs.refetch();
    } catch (e) {
      notifications.show({ color: "red", message: apiError(e) });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader title="SMS" subtitle="Message a customer or provider, and look up delivered messages (e.g. an OTP a customer didn't receive)." />

      <Card withBorder radius="md" padding="lg" maw={520} mb="lg">
        <Text fw={700} mb="sm">Send a message</Text>
        <form onSubmit={form.onSubmit(send)}>
          <Stack>
            <PhoneInput label="Phone" value={form.values.phone} onChange={(v) => form.setFieldValue("phone", v)} error={form.errors.phone} />
            <Textarea label="Message" autosize minRows={3} maxRows={6} {...form.getInputProps("text")} />
            <Group justify="space-between">
              <Text size="xs" c="dimmed">{form.values.text.length}/400</Text>
              <Button type="submit" loading={sending}>Send</Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <Card withBorder radius="md" padding="md">
        <Group justify="space-between" mb="sm">
          <Text fw={700}>Delivery log</Text>
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder="Search by phone (e.g. 0712…)"
            value={q}
            onChange={(e) => { setQ(e.currentTarget.value); setPage(1); }}
            w={260}
          />
        </Group>
        {logs.isLoading ? <Center h={160}><Loader /></Center> : (
          <Table.ScrollContainer minWidth={640}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr><Table.Th>Phone</Table.Th><Table.Th>Message</Table.Th><Table.Th>Status</Table.Th><Table.Th>Sent</Table.Th></Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {logs.data?.items.map((s: SmsLog) => (
                  <Table.Tr key={s.id}>
                    <Table.Td><Text size="sm" fw={600}>{s.destination}</Text></Table.Td>
                    <Table.Td><Text size="sm" style={{ maxWidth: 420 }}>{s.message}</Text></Table.Td>
                    <Table.Td><Badge color={s.status === "failed" ? "red" : "teal"} variant="light">{s.status}</Badge></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{date(s.created_at)}</Text></Table.Td>
                  </Table.Tr>
                ))}
                {logs.data && !logs.data.items.length && (
                  <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" py="md">{q ? "No messages for that number." : "No messages yet."}</Text></Table.Td></Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
        <Pager page={page} total={logs.data?.total ?? 0} onChange={setPage} />
      </Card>
    </>
  );
}
