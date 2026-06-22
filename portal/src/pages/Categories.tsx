import { Badge, Button, Center, Group, Loader, Modal, Switch, Table, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPlus } from "@tabler/icons-react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import type { Category } from "../lib/types";

export default function Categories() {
  const qc = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const categories = useQuery({ queryKey: ["categories", "all"], queryFn: () => api.categories(true) });

  const form = useForm({
    initialValues: { key: "", name: "", description: "" },
    validate: {
      key: (v) => (/^[a-z_]{2,40}$/.test(v) ? null : "lowercase letters/underscores only"),
      name: (v) => (v.length < 2 ? "Required" : null),
    },
  });

  const create = useMutation({
    mutationFn: (v: typeof form.values) => api.createCategory(v),
    onSuccess: (res) => {
      notifications.show({ color: "teal", message: res.data?.message ?? "Category created" });
      qc.invalidateQueries({ queryKey: ["categories"] });
      form.reset();
      close();
    },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => api.updateCategory(id, { active }),
    onSuccess: (res) => {
      notifications.show({ color: "teal", message: res.data?.message ?? "Category updated" });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  return (
    <>
      <PageHeader
        title="Service categories"
        subtitle="The catalogue of services customers can book"
        action={<Button leftSection={<IconPlus size={16} />} onClick={open}>Add category</Button>}
      />
      {categories.isLoading ? (
        <Center h={200}><Loader /></Center>
      ) : (
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Key</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Active</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(categories.data ?? []).map((c: Category) => (
              <Table.Tr key={c.id}>
                <Table.Td fw={600}>{c.name}</Table.Td>
                <Table.Td><Badge variant="outline" color="gray">{c.key}</Badge></Table.Td>
                <Table.Td>{c.description ?? "—"}</Table.Td>
                <Table.Td>
                  <Switch
                    checked={!!c.active}
                    onChange={(e) => toggle.mutate({ id: c.id, active: e.currentTarget.checked })}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={opened} onClose={close} title="Add service category" centered>
        <form onSubmit={form.onSubmit((v) => create.mutate(v))}>
          <TextInput label="Name" placeholder="Borehole Drilling" {...form.getInputProps("name")} mb="sm" />
          <TextInput label="Key" placeholder="drillers" {...form.getInputProps("key")} mb="sm" />
          <TextInput label="Description (optional)" {...form.getInputProps("description")} mb="md" />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create</Button>
          </Group>
        </form>
      </Modal>
    </>
  );
}
