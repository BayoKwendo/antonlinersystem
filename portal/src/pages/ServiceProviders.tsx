import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Anchor, Badge, Button, Card, Group, Modal, SegmentedControl, Stack, Table, Text, Textarea, TextInput, ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { IconFileCheck, IconCheck, IconX, IconEye, IconSearch, IconStar } from "@tabler/icons-react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { Pager, PAGE_SIZE } from "../components/Pager";
import { ProviderKpiModal } from "../components/ProviderKpiModal";
import { date } from "../lib/format";

const STATUS_COLOR: Record<string, string> = { pending: "yellow", verified: "teal", rejected: "red" };
const DOC_LABEL: Record<string, string> = {
  certificate_of_incorporation: "Certificate of Incorporation", cr12: "CR12", kra_pin: "KRA PIN Certificate",
  director_id: "Director National ID", accreditation: "Regulator Accreditation", bank_details: "Bank Details",
};

export default function ServiceProviders() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const [kpiFor, setKpiFor] = useState<{ id: number; name: string } | null>(null);
  const [params] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const [search, setSearch] = useState(qParam);
  // Arrived via a ?q deep link (global search): show all statuses and pre-filter.
  useEffect(() => { if (qParam) { setSearch(qParam); setStatus("all"); setPage(1); } }, [qParam]);

  const list = useQuery({
    queryKey: ["provider-apps", status, page],
    queryFn: () => api.providerApplications({ status: status === "all" ? undefined : status, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const detail = useQuery({
    queryKey: ["provider-app", reviewId],
    queryFn: () => api.providerApplication(reviewId as number),
    enabled: reviewId != null,
  });

  const decide = useMutation({
    mutationFn: ({ userId, approve }: { userId: number; approve: boolean }) => api.verifyProvider(userId, approve, reason.trim() || undefined),
    onSuccess: (_r, v) => {
      notifications.show({ color: v.approve ? "teal" : "orange", message: v.approve ? "Provider approved — verification SMS sent." : "Application rejected — SMS sent with the reason." });
      qc.invalidateQueries({ queryKey: ["provider-apps"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      close(); setReviewId(null); setReason("");
    },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  const openReview = (userId: number) => { setReviewId(userId); setReason(""); open(); };

  const s = search.trim().toLowerCase();
  const rows = (list.data?.items ?? []).filter((p) =>
    !s || [p.business_name, p.display_name, p.phone, p.email].some((v) => (v ?? "").toString().toLowerCase().includes(s)));

  return (
    <>
      <PageHeader title="Service Providers" subtitle="Review provider applications, verify documents, and approve or reject. Providers self-register in the app." />

      <Group mb="md" justify="space-between">
        <SegmentedControl
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          data={[{ label: "Pending", value: "pending" }, { label: "Verified", value: "verified" }, { label: "Rejected", value: "rejected" }, { label: "All", value: "all" }]}
        />
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder="Search business, contact or phone"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={280}
        />
      </Group>

      <Card withBorder radius="md" padding={0}>
        <Table.ScrollContainer minWidth={720}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr><Table.Th>Business</Table.Th><Table.Th>Contact</Table.Th><Table.Th>Services</Table.Th><Table.Th>Docs</Table.Th><Table.Th>Status</Table.Th><Table.Th /></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((p) => (
                <Table.Tr key={p.user_id}>
                  <Table.Td><Text fw={600}>{p.business_name ?? p.display_name}</Text><Text size="xs" c="dimmed">{p.display_name}</Text></Table.Td>
                  <Table.Td><Text size="sm">{p.phone}</Text><Text size="xs" c="dimmed">{p.email ?? ""}</Text></Table.Td>
                  <Table.Td><Text size="sm">{p.service_names ?? "—"}</Text></Table.Td>
                  <Table.Td><Badge variant="light" color={p.documents >= 6 ? "teal" : "gray"}>{p.documents}</Badge></Table.Td>
                  <Table.Td><Badge color={STATUS_COLOR[p.verification_status] ?? "gray"} variant="light">{p.verification_status}</Badge></Table.Td>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap" justify="flex-end">
                      <Button size="xs" variant="subtle" color="gray" leftSection={<IconStar size={14} />} onClick={() => setKpiFor({ id: p.user_id, name: p.business_name ?? p.display_name })}>Rating</Button>
                      <Button size="xs" variant="light" leftSection={<IconEye size={14} />} onClick={() => openReview(p.user_id)}>Review</Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {list.data && !rows.length && (
                <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="md">{s ? `No providers match “${search}”.` : `No ${status === "all" ? "" : status} applications.`}</Text></Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
      <Pager page={page} total={list.data?.total ?? 0} onChange={setPage} />

      <Modal opened={opened} onClose={close} title="Provider application" size="lg" centered>
        {detail.isLoading || !detail.data ? <Text c="dimmed">Loading…</Text> : (
          <Stack gap="md">
            <Card withBorder radius="md" padding="sm">
              <Group justify="space-between">
                <div>
                  <Text fw={700}>{detail.data.account.business_name ?? detail.data.account.display_name}</Text>
                  <Text size="sm" c="dimmed">{detail.data.account.display_name} · {detail.data.account.phone}</Text>
                  <Text size="sm" c="dimmed">{detail.data.account.email ?? ""}</Text>
                  <Text size="sm" mt={4}>KRA PIN: <b>{detail.data.account.kra_pin ?? "—"}</b></Text>
                  {detail.data.account.bank_details && <Text size="sm">Bank: {detail.data.account.bank_details}</Text>}
                </div>
                <Badge color={STATUS_COLOR[detail.data.account.verification_status]} variant="light">{detail.data.account.verification_status}</Badge>
              </Group>
              {detail.data.account.verification_note && <Text size="xs" c="dimmed" mt="xs">Last note: {detail.data.account.verification_note}</Text>}
            </Card>

            <div>
              <Text fw={600} size="sm" mb={6}>Services applied for</Text>
              <Group gap="xs">
                {detail.data.services.map((s) => (
                  <Badge key={s.key} variant="light" color={s.code ? "teal" : "blue"}>{s.name}{s.code ? ` · ${s.code}` : ""}</Badge>
                ))}
              </Group>
            </div>

            <div>
              <Text fw={600} size="sm" mb={6}>Statutory documents ({detail.data.documents.length})</Text>
              <Stack gap={6}>
                {detail.data.documents.map((d) => (
                  <Group key={d.id} gap="xs">
                    <ThemeIcon variant="light" color="blue" size={26} radius="sm"><IconFileCheck size={15} /></ThemeIcon>
                    <Text size="sm" style={{ flex: 1 }}>{DOC_LABEL[d.kind] ?? d.kind}</Text>
                    <Anchor href={d.url} target="_blank" size="sm">View</Anchor>
                    <Text size="xs" c="dimmed">{date(d.created_at)}</Text>
                  </Group>
                ))}
                {!detail.data.documents.length && <Text size="sm" c="dimmed">No documents uploaded.</Text>}
              </Stack>
            </div>

            <Textarea
              label="Reason / note (required when rejecting — texted to the provider)"
              placeholder="e.g. CR12 is illegible — please re-upload a clear copy."
              value={reason} onChange={(e) => setReason(e.currentTarget.value)} autosize minRows={2}
            />
            <Group justify="flex-end">
              <Button color="red" variant="light" leftSection={<IconX size={16} />}
                loading={decide.isPending}
                onClick={() => { if (!reason.trim()) { notifications.show({ color: "red", message: "Please give a reason for rejection." }); return; } decide.mutate({ userId: detail.data!.account.user_id, approve: false }); }}>
                Reject
              </Button>
              <Button color="teal" leftSection={<IconCheck size={16} />}
                loading={decide.isPending}
                onClick={() => decide.mutate({ userId: detail.data!.account.user_id, approve: true })}>
                Approve &amp; issue IDs
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <ProviderKpiModal userId={kpiFor?.id ?? null} name={kpiFor?.name} opened={!!kpiFor} onClose={() => setKpiFor(null)} />
    </>
  );
}
