import { Button, Card, Group, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { useAuth } from "../store/auth";
import { PageHeader } from "../components/PageHeader";

export default function Profile() {
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const profile = useForm({
    initialValues: { display_name: user?.display_name ?? "", email: "" },
    validate: { display_name: (v) => (v.length < 2 ? "Required" : null) },
  });

  const pw = useForm({
    initialValues: { current: "", next: "", confirm: "" },
    validate: {
      next: (v) => (v.length < 6 ? "Min 6 characters" : null),
      confirm: (v, vals) => (v !== vals.next ? "Passwords do not match" : null),
    },
  });

  async function saveProfile(v: typeof profile.values) {
    setSavingProfile(true);
    try {
      await api.updateProfile({ display_name: v.display_name, email: v.email || undefined });
      await hydrate();
      notifications.show({ color: "teal", message: "Profile updated" });
    } catch (e) {
      notifications.show({ color: "red", message: apiError(e) });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(v: typeof pw.values) {
    setSavingPw(true);
    try {
      await api.changePassword(v.current, v.next);
      pw.reset();
      notifications.show({ color: "teal", message: "Password changed" });
    } catch (e) {
      notifications.show({ color: "red", message: apiError(e) });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <>
      <PageHeader title="My profile" subtitle={user ? `${user.phone} · ${user.roles.join(", ")}` : ""} />
      <Group align="flex-start" grow wrap="wrap">
        <Card withBorder radius="md" padding="lg" maw={460}>
          <Text fw={700} mb="md">Details</Text>
          <form onSubmit={profile.onSubmit(saveProfile)}>
            <Stack>
              <TextInput label="Display name" {...profile.getInputProps("display_name")} />
              <TextInput label="Email" placeholder="(optional)" {...profile.getInputProps("email")} />
              <Button type="submit" loading={savingProfile} w="fit-content">Save</Button>
            </Stack>
          </form>
        </Card>

        <Card withBorder radius="md" padding="lg" maw={460}>
          <Text fw={700} mb="md">Change password</Text>
          <form onSubmit={pw.onSubmit(changePassword)}>
            <Stack>
              <PasswordInput label="Current password" {...pw.getInputProps("current")} />
              <PasswordInput label="New password" {...pw.getInputProps("next")} />
              <PasswordInput label="Confirm new password" {...pw.getInputProps("confirm")} />
              <Button type="submit" loading={savingPw} w="fit-content">Update password</Button>
            </Stack>
          </form>
        </Card>
      </Group>
    </>
  );
}
