import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Drawer,
  Group,
  Loader,
  Menu,
  Modal,
  NumberInput,
  Rating,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconDots, IconDownload, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { PAGE_SIZE, Pager } from "../components/Pager";
import { downloadCsv } from "../lib/csv";
import { date, money, statusColor, titleCase } from "../lib/format";
import { sanitizePhone, validatePhone } from "../lib/validation";
import type { Provider } from "../lib/types";

function ProviderDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["provider", id],
    queryFn: () => api.providerDetail(id as number),
    enabled: id != null,
  });
  const lat = data?.profile.lat ? Number(data.profile.lat) : null;
  const lng = data?.profile.lng ? Number(data.profile.lng) : null;
  const mapSrc = lat && lng ? `https://maps.google.com/maps?q=${lat},${lng}&z=13&output=embed` : null;

  return (
    <Drawer opened={id != null} onClose={onClose} position="right" size="lg" title="Provider detail">
      {isLoading || !data ? <Center h={200}><Loader /></Center> : (
        <Stack>
          <Group justify="space-between">
            <div>
              <Text fz="xl" fw={800}>{data.profile.display_name}</Text>
              <Text c="dimmed">{titleCase(data.profile.category)} · {data.profile.phone}</Text>
            </div>
            <Badge color={statusColor(data.profile.availability)} variant="light" size="lg">
              {data.profile.availability}
            </Badge>
          </Group>

          <SimpleGrid cols={3}>
            <Card withBorder padding="sm"><Text size="xs" c="dimmed">Earnings</Text><Text fw={700}>{money(data.earnings)}</Text></Card>
            <Card withBorder padding="sm"><Text size="xs" c="dimmed">Jobs</Text><Text fw={700}>{data.jobs}</Text></Card>
            <Card withBorder padding="sm">
              <Text size="xs" c="dimmed">Rating</Text>
              <Group gap={4}><Rating value={Number(data.profile.rating_avg)} readOnly size="xs" fractions={2} /><Text size="sm">({data.profile.rating_count})</Text></Group>
            </Card>
          </SimpleGrid>

          {mapSrc && (
            <iframe title="provider-map" src={mapSrc} style={{ border: 0, width: "100%", height: 200, borderRadius: 8 }} loading="lazy" />
          )}

          <div>
            <Text fw={700} mb="xs">Recent jobs</Text>
            <Table>
              <Table.Tbody>
                {data.recent_bookings.map((b) => (
                  <Table.Tr key={b.id}>
                    <Table.Td>#{b.id}</Table.Td>
                    <Table.Td>{b.customer_name}</Table.Td>
                    <Table.Td><Badge size="sm" color={statusColor(b.status)} variant="light">{titleCase(b.status)}</Badge></Table.Td>
                    <Table.Td ta="right">{money(b.total_amount)}</Table.Td>
                  </Table.Tr>
                ))}
                {data.recent_bookings.length === 0 && <Table.Tr><Table.Td><Text c="dimmed" size="sm">No jobs yet</Text></Table.Td></Table.Tr>}
              </Table.Tbody>
            </Table>
          </div>

          <div>
            <Text fw={700} mb="xs">Reviews</Text>
            <Stack gap="xs">
              {data.reviews.length === 0 && <Text c="dimmed" size="sm">No reviews</Text>}
              {data.reviews.map((r) => (
                <Card key={r.id} withBorder padding="sm">
                  <Group justify="space-between">
                    <Rating value={r.rating} readOnly size="xs" />
                    <Text size="xs" c="dimmed">{date(r.created_at)}</Text>
                  </Group>
                  {r.comment && <Text size="sm" mt={4}>{r.comment}</Text>}
                  <Text size="xs" c="dimmed">— {r.customer_name}</Text>
                </Card>
              ))}
            </Stack>
          </div>
        </Stack>
      )}
    </Drawer>
  );
}

export default function Providers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const providers = useQuery({
    queryKey: ["providers", q, page],
    queryFn: () => api.providers({ q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api.categories(true) });
  const items = providers.data?.items ?? [];

  const form = useForm({
    initialValues: { phone: "", display_name: "", password: "", category: "", base_price: 0, bio: "" },
    validate: {
      phone: validatePhone,
      display_name: (v) => (v.length < 2 ? "Required" : null),
      password: (v) => (v.length < 6 ? "Min 6 characters" : null),
      category: (v) => (!v ? "Pick a category" : null),
    },
  });

  const onboard = useMutation({
    mutationFn: (v: typeof form.values) => api.onboardProvider(v),
    onSuccess: () => {
      notifications.show({ color: "teal", message: "Provider onboarded" });
      qc.invalidateQueries({ queryKey: ["providers"] });
      form.reset();
      close();
    },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => api.updateProvider(id, body),
    onSuccess: () => {
      notifications.show({ color: "teal", message: "Updated" });
      qc.invalidateQueries({ queryKey: ["providers"] });
      setEditing(null);
    },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  const [editing, setEditing] = useState<Provider | null>(null);
  const editForm = useForm({
    initialValues: { display_name: "", phone: "", base_price: 0, bio: "" },
    validate: { display_name: (v) => (v.length < 2 ? "Required" : null), phone: validatePhone },
  });
  function openEdit(p: Provider) {
    editForm.setValues({ display_name: p.display_name, phone: p.phone, base_price: Number(p.base_price), bio: "" });
    setEditing(p);
  }

  return (
    <>
      <PageHeader
        title="Providers"
        subtitle="Drillers, pump installers, surveyors and other service units"
        action={
          <Group>
            <Button variant="default" leftSection={<IconDownload size={16} />} onClick={() => downloadCsv("providers.csv", items)}>Export</Button>
            <Button leftSection={<IconPlus size={16} />} onClick={open}>Onboard provider</Button>
          </Group>
        }
      />

      <TextInput
        placeholder="Search by name or phone"
        mb="md"
        value={q}
        onChange={(e) => { setQ(e.currentTarget.value); setPage(1); }}
        w={320}
      />

      {providers.isLoading ? <Center h={200}><Loader /></Center> : (
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Phone</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Price</Table.Th>
                <Table.Th>Rating</Table.Th>
                <Table.Th>Availability</Table.Th>
                <Table.Th>Verified</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((p: Provider) => (
                <Table.Tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setDetailId(p.id)}>
                  <Table.Td>
                    <Text fw={600}>{p.display_name}</Text>
                    {p.status === "suspended" && <Badge color="red" size="xs">Suspended</Badge>}
                  </Table.Td>
                  <Table.Td>{p.phone}</Table.Td>
                  <Table.Td>{titleCase(p.category)}</Table.Td>
                  <Table.Td>{money(p.base_price)}</Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <Rating value={Number(p.rating_avg)} fractions={2} readOnly size="xs" />
                      <Text size="xs" c="dimmed">({p.rating_count})</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td><Badge color={statusColor(p.availability)} variant="light">{p.availability}</Badge></Table.Td>
                  <Table.Td>{p.verified_at ? <Badge color="teal" variant="light">Yes</Badge> : <Badge color="gray" variant="light">No</Badge>}</Table.Td>
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target><ActionIcon variant="subtle"><IconDots size={18} /></ActionIcon></Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item onClick={() => openEdit(p)}>Edit details…</Menu.Item>
                        <Menu.Item onClick={() => update.mutate({ id: p.id, body: { verified: !p.verified_at } })}>
                          {p.verified_at ? "Unverify" : "Verify"}
                        </Menu.Item>
                        <Menu.Item
                          color={p.status === "suspended" ? "teal" : "red"}
                          onClick={() => update.mutate({ id: p.id, body: { suspended: p.status !== "suspended" } })}
                        >
                          {p.status === "suspended" ? "Reactivate" : "Suspend"}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      <Pager page={page} total={providers.data?.total ?? 0} onChange={setPage} />

      <ProviderDrawer id={detailId} onClose={() => setDetailId(null)} />

      <Modal opened={opened} onClose={close} title="Onboard provider" centered>
        <form onSubmit={form.onSubmit((v) => onboard.mutate(v))}>
          <TextInput label="Full name" {...form.getInputProps("display_name")} mb="sm" />
          <TextInput
            label="Phone"
            placeholder="2547XXXXXXXX"
            inputMode="tel"
            {...form.getInputProps("phone")}
            onChange={(e) => form.setFieldValue("phone", sanitizePhone(e.currentTarget.value))}
            mb="sm"
          />
          <TextInput label="Initial password" type="password" {...form.getInputProps("password")} mb="sm" />
          <Select
            label="Service category"
            data={(categories.data ?? []).map((c) => ({
              value: c.key,
              label: c.active ? c.name : `${c.name} (inactive)`,
              disabled: !c.active,
            }))}
            {...form.getInputProps("category")}
            mb="sm"
          />
          <NumberInput label="Base price (KES)" min={0} {...form.getInputProps("base_price")} mb="sm" />
          <TextInput label="Bio (optional)" {...form.getInputProps("bio")} mb="md" />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button type="submit" loading={onboard.isPending}>Create</Button>
          </Group>
        </form>
      </Modal>

      <Modal opened={editing != null} onClose={() => setEditing(null)} title={`Edit — ${editing?.display_name ?? ""}`} centered>
        <form onSubmit={editForm.onSubmit((v) => { if (editing) update.mutate({ id: editing.id, body: { ...v, bio: v.bio || undefined } }); })}>
          <TextInput label="Full name" {...editForm.getInputProps("display_name")} mb="sm" />
          <TextInput label="Phone" inputMode="tel" {...editForm.getInputProps("phone")}
            onChange={(e) => editForm.setFieldValue("phone", sanitizePhone(e.currentTarget.value))} mb="sm" />
          <NumberInput label="Base price (KES)" min={0} {...editForm.getInputProps("base_price")} mb="sm" />
          <TextInput label="Bio (optional)" {...editForm.getInputProps("bio")} mb="md" />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" loading={update.isPending}>Save</Button>
          </Group>
        </form>
      </Modal>
    </>
  );
}
