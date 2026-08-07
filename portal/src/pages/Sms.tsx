import { Button, Card, Group, Stack, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { validatePhone } from "../lib/validation";
import { PhoneInput } from "../components/PhoneInput";

export default function Sms() {
  const [sending, setSending] = useState(false);
  const form = useForm({
    initialValues: { phone: "", text: "" },
    validate: {
      phone: validatePhone,
      text: (v) => (v.trim().length < 1 ? "Message is required" : v.length > 400 ? "Too long" : null),
    },
  });

  async function send(v: typeof form.values) {
    setSending(true);
    try {
      await api.sendSms(v.phone, v.text);
      notifications.show({ color: "teal", message: "SMS sent" });
      form.setFieldValue("text", "");
    } catch (e) {
      notifications.show({ color: "red", message: apiError(e) });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader title="Send SMS" subtitle="Message a customer or provider directly" />
      <Card withBorder radius="md" padding="lg" maw={520}>
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
    </>
  );
}
