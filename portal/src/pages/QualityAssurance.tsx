import { useState } from "react";
import {
  Anchor, Badge, Button, Card, Divider, Group, Modal, Rating, Stack, Table, Text, Textarea, ThemeIcon,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { IconFileText, IconShieldCheck } from "@tabler/icons-react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { money, date } from "../lib/format";
import type { RequestRow } from "../lib/types";

export default function QualityAssurance() {
  const qc = useQueryClient();
  const [review, setReview] = useState<RequestRow | null>(null);
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");

  const q = useQuery({ queryKey: ["qa-queue"], queryFn: () => api.adminRequests({ status: "completed" }) });
  const docs = useQuery({ queryKey: ["req-docs", review?.id], queryFn: () => api.requestDocuments(review!.id), enabled: !!review });
  const dList = docs.data ?? [];
  const hasReport = dList.some((d) => d.kind === "report");
  const hasEtims = dList.some((d) => d.kind === "etims_invoice");
  const canVerify = hasReport && hasEtims;

  const refresh = () => { qc.invalidateQueries({ queryKey: ["qa-queue"] }); qc.invalidateQueries({ queryKey: ["overview"] }); };
  const fail = (e: unknown) => notifications.show({ color: "red", message: apiError(e) });

  const rate = useMutation({
    mutationFn: () => api.rateProvider(review!.id, { rating, note: note.trim() || undefined }),
    onSuccess: () => notifications.show({ color: "teal", message: "Rating saved." }),
    onError: fail,
  });
  const verify = useMutation({
    mutationFn: async () => { await api.rateProvider(review!.id, { rating, note: note.trim() || undefined }); await api.verifyCompletion(review!.id); },
    onSuccess: () => { notifications.show({ color: "teal", message: "Verified — final payout released and job closed." }); refresh(); setReview(null); setNote(""); setRating(5); },
    onError: fail,
  });

  return (
    <>
      <PageHeader title="Quality Assurance" subtitle="Confirm customer satisfaction, rate the provider, then release the final payment and close the job." />

      <Card withBorder radius="md" padding={0}>
        <Table.ScrollContainer minWidth={760}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr><Table.Th>Request</Table.Th><Table.Th>Service</Table.Th><Table.Th>Customer</Table.Th><Table.Th>Provider</Table.Th><Table.Th ta="right">Fee</Table.Th><Table.Th /></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {q.data?.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td><Text size="sm" fw={600}>{r.request_no ?? `#${r.id}`}</Text><Text size="xs" c="dimmed">{date(r.scheduled_at ?? r.created_at)}</Text></Table.Td>
                  <Table.Td>{r.service_name}</Table.Td>
                  <Table.Td><Text size="sm">{r.customer_name}</Text><Text size="xs" c="dimmed">{r.customer_phone ?? ""}</Text></Table.Td>
                  <Table.Td>{r.provider_name ?? "—"}</Table.Td>
                  <Table.Td ta="right">{money(Number(r.quoted_amount) || Number(r.total_amount) || 0)}</Table.Td>
                  <Table.Td><Button size="xs" variant="light" leftSection={<IconShieldCheck size={14} />} onClick={() => { setReview(r); setRating(5); setNote(""); }}>Review</Button></Table.Td>
                </Table.Tr>
              ))}
              {q.data && !q.data.length && <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="md">Nothing awaiting QA.</Text></Table.Td></Table.Tr>}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal opened={!!review} onClose={() => setReview(null)} title={`QA review — ${review?.request_no ?? ""}`} size="lg" centered>
        {review && (
          <Stack gap="md">
            <Group justify="space-between">
              <div><Text fw={700}>{review.service_name}</Text><Text size="sm" c="dimmed">{review.customer_name} · provider: {review.provider_name ?? "—"}</Text></div>
              <Badge color="yellow" variant="light">Awaiting QA</Badge>
            </Group>

            <div>
              <Text fw={600} size="sm" mb={6}>Deliverables</Text>
              <Group gap="xs" mb={8}>
                <Badge color={hasReport ? "teal" : "red"} variant="light">{hasReport ? "✓" : "✗"} Completion report</Badge>
                <Badge color={hasEtims ? "teal" : "red"} variant="light">{hasEtims ? "✓" : "✗"} eTIMS invoice</Badge>
              </Group>
              <Stack gap={6}>
                {docs.data?.map((d) => (
                  <Group key={d.id} gap="xs">
                    <ThemeIcon variant="light" size={26} radius="sm"><IconFileText size={15} /></ThemeIcon>
                    <Text size="sm" style={{ flex: 1 }}>{d.kind}</Text>
                    <Anchor href={d.url} target="_blank" size="sm">View</Anchor>
                  </Group>
                ))}
                {docs.data && !docs.data.length && <Text size="sm" c="dimmed">No deliverables uploaded.</Text>}
              </Stack>
              {!canVerify && <Text size="xs" c="red" mt={6}>Final payment can only be released once both the completion report and the provider's eTIMS invoice are uploaded (via the provider app).</Text>}
            </div>

            <Divider label="Provider rating (Smart Drill QA)" />
            <Group><Text size="sm">Overall:</Text><Rating value={rating} onChange={setRating} /></Group>
            <Textarea label="QA note (optional)" placeholder="Customer feedback, timeliness, quality observations…" value={note} onChange={(e) => setNote(e.currentTarget.value)} autosize minRows={2} />

            <Group justify="flex-end">
              <Button variant="default" loading={rate.isPending} onClick={() => rate.mutate()}>Save rating only</Button>
              <Button color="teal" leftSection={<IconShieldCheck size={16} />} loading={verify.isPending} disabled={!canVerify} onClick={() => verify.mutate()}>Verify &amp; release payment</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
