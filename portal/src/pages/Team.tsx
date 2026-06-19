import {
  ActionIcon, Badge, Button, Center, Group, Loader, Menu, Modal, PasswordInput,
  Select, Table, TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconDots, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { PAGE_SIZE, Pager } from "../components/Pager";
import { date, statusColor, titleCase } from "../lib/format";
import { sanitizePhone, validatePhone } from "../lib/validation";
import type { StaffUser } from "../lib/types";

const ROLES = ["admin", "assistance", "finance", "owner", "agent"];

export default function Team() {
  const qc = useQueryClient();
  const [role, setRole] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, createCtl] = useDisclosure(false);
  const [pwUser, setPwUser] = useState<StaffUser | null>(null);
  const [newPw, setNewPw] = useState("");

  const users = useQuery({
    queryKey: ["users", role, q, page],
    queryFn: () => api.users({ role: role ?? undefined, q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const items = users.data?.items ?? [];

  const form = useForm({
    initialValues: { display_name: "", phone: "", password: "", role: "assistance", email: "" },
    validate: {
      display_name: (v) => (v.length < 2 ? "Required" : null),
      phone: validatePhone,
      password: (v) => (v.length < 6 ? "Min 6 characters" : null),
    },
  });

  const create = useMutation({
    mutationFn: (v: typeof form.values) => api.createUser({ ...v, email: v.email || undefined }),
    onSuccess: () => { notifications.show({ color: "teal", message: "User created" }); qc.invalidateQueries({ queryKey: ["users"] }); form.reset(); createCtl.close(); },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => api.updateUser(id, body),
    onSuccess: () => { notifications.show({ color: "teal", message: "Updated" }); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  function submitPassword() {
    if (pwUser && newPw.length >= 6) {
      update.mutate({ id: pwUser.id, body: { password: newPw } });
      setPwUser(null); setNewPw("");
    }
  }

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Staff, owners and agents"
        action={<Button leftSection={<IconPlus size={16} />} onClick={createCtl.open}>Add member</Button>}
      />
      <Group mb="md">
        <Select placeholder="All roles" clearable data={ROLES.map((r) => ({ value: r, label: titleCase(r) }))}
          value={role} onChange={(v) => { setRole(v); setPage(1); }} w={200} />
        <TextInput placeholder="Search name or phone" value={q} onChange={(e) => { setQ(e.currentTarget.value); setPage(1); }} w={260} />
      </Group>

      {users.isLoading ? <Center h={200}><Loader /></Center> : (
        <Table.ScrollContainer minWidth={760}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th><Table.Th>Phone</Table.Th><Table.Th>Roles</Table.Th>
                <Table.Th>Status</Table.Th><Table.Th>Joined</Table.Th><Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((u: StaffUser) => (
                <Table.Tr key={u.id}>
                  <Table.Td fw={600}>{u.display_name}</Table.Td>
                  <Table.Td>{u.phone}</Table.Td>
                  <Table.Td>{(u.roles ?? "").split(",").filter(Boolean).map((r) => <Badge key={r} mr={4} variant="light">{titleCase(r)}</Badge>)}</Table.Td>
                  <Table.Td><Badge color={statusColor(u.status)} variant="light">{u.status}</Badge></Table.Td>
                  <Table.Td>{date(u.created_at)}</Table.Td>
                  <Table.Td>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target><ActionIcon variant="subtle"><IconDots size={18} /></ActionIcon></Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Set role</Menu.Label>
                        {ROLES.map((r) => (
                          <Menu.Item key={r} onClick={() => update.mutate({ id: u.id, body: { role: r } })}>{titleCase(r)}</Menu.Item>
                        ))}
                        <Menu.Divider />
                        <Menu.Item onClick={() => setPwUser(u)}>Set password…</Menu.Item>
                        <Menu.Item color={u.status === "suspended" ? "teal" : "red"}
                          onClick={() => update.mutate({ id: u.id, body: { suspended: u.status !== "suspended" } })}>
                          {u.status === "suspended" ? "Reactivate" : "Suspend"}
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
      <Pager page={page} total={users.data?.total ?? 0} onChange={setPage} />

      <Modal opened={createOpen} onClose={createCtl.close} title="Add team member" centered>
        <form onSubmit={form.onSubmit((v) => create.mutate(v))}>
          <TextInput label="Full name" {...form.getInputProps("display_name")} mb="sm" />
          <TextInput label="Phone" placeholder="2547XXXXXXXX" inputMode="tel" {...form.getInputProps("phone")}
            onChange={(e) => form.setFieldValue("phone", sanitizePhone(e.currentTarget.value))} mb="sm" />
          <TextInput label="Email (optional)" {...form.getInputProps("email")} mb="sm" />
          <Select label="Role" data={ROLES.map((r) => ({ value: r, label: titleCase(r) }))} {...form.getInputProps("role")} mb="sm" />
          <PasswordInput label="Initial password" {...form.getInputProps("password")} mb="md" />
          <Group justify="flex-end">
            <Button variant="default" onClick={createCtl.close}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create</Button>
          </Group>
        </form>
      </Modal>

      <Modal opened={pwUser != null} onClose={() => setPwUser(null)} title={`Set password — ${pwUser?.display_name ?? ""}`} centered>
        <PasswordInput label="New password" value={newPw} onChange={(e) => setNewPw(e.currentTarget.value)} mb="md" />
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setPwUser(null)}>Cancel</Button>
          <Button onClick={submitPassword} disabled={newPw.length < 6}>Save</Button>
        </Group>
      </Modal>
    </>
  );
}
