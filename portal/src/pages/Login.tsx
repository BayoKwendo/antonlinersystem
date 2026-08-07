import { Anchor, Button, Center, Group, Modal, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { Logo } from "../components/Logo";
import { sanitizePhone, validatePhone } from "../lib/validation";

export default function Login() {
  const login = useAuth((s) => s.login);
  const hydrate = useAuth((s) => s.hydrate);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const dest = location.state?.from?.pathname ?? "/";
  const [loading, setLoading] = useState(false);
  const [forgotOpen, forgot] = useDisclosure(false);
  const [resetPhone, setResetPhone] = useState("");
  const [resetting, setResetting] = useState(false);
  // Holds the temporary password while the user is forced to set a new one.
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [savingNew, setSavingNew] = useState(false);

  const form = useForm({
    initialValues: { phone: "", password: "" },
    validate: {
      phone: validatePhone,
      password: (v) => (v.length < 4 ? "Enter your password" : null),
    },
  });

  const newPwForm = useForm({
    initialValues: { next: "", confirm: "" },
    validate: {
      next: (v) => (v.length < 6 ? "Min 6 characters" : null),
      confirm: (v, vals) => (v !== vals.next ? "Passwords do not match" : null),
    },
  });

  async function submit(values: typeof form.values) {
    setLoading(true);
    try {
      await login(values.phone, values.password);
      // First login after a reset → force the user to set a new password.
      if (useAuth.getState().user?.must_change_password) {
        setTempPassword(values.password);
        return;
      }
      navigate(dest, { replace: true });
    } catch (e) {
      notifications.show({ color: "red", title: "Login failed", message: apiError(e) });
    } finally {
      setLoading(false);
    }
  }

  async function setNewPassword(v: typeof newPwForm.values) {
    if (!tempPassword) return;
    setSavingNew(true);
    try {
      await api.changePassword(tempPassword, v.next);
      await hydrate(); // refresh user (clears the flag)
      navigate(dest, { replace: true });
    } catch (e) {
      notifications.show({ color: "red", message: apiError(e) });
    } finally {
      setSavingNew(false);
    }
  }

  async function resetPassword() {
    if (validatePhone(resetPhone)) {
      notifications.show({ color: "red", message: "Enter a valid phone number" });
      return;
    }
    setResetting(true);
    try {
      await api.resetPassword(resetPhone);
      notifications.show({ color: "teal", message: "If the number is registered, a temporary password was sent by SMS." });
      forgot.close();
      setResetPhone("");
    } catch (e) {
      notifications.show({ color: "red", message: apiError(e) });
    } finally {
      setResetting(false);
    }
  }

  return (
    <Center mih="100vh" bg="brand.0">
      <Paper shadow="md" radius="lg" p="xl" w={380} withBorder>
        <Stack gap="xs" mb="md">
          <Logo />
          <Text c="dimmed" size="sm">SMART Drill — staff portal</Text>
        </Stack>
        <form onSubmit={form.onSubmit(submit)}>
          <Stack>
            <TextInput
              label="Phone"
              placeholder="2547XXXXXXXX"
              inputMode="tel"
              {...form.getInputProps("phone")}
              onChange={(e) => form.setFieldValue("phone", sanitizePhone(e.currentTarget.value))}
            />
            <PasswordInput label="Password" placeholder="Your password" {...form.getInputProps("password")} />
            <Button type="submit" loading={loading} fullWidth mt="sm">Sign in</Button>
            <Anchor size="sm" ta="center" onClick={forgot.open} style={{ cursor: "pointer" }}>
              Forgot password?
            </Anchor>
          </Stack>
        </form>
      </Paper>

      <Modal
        opened={tempPassword != null}
        onClose={() => {}}
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        title="Set a new password"
        centered
      >
        <Text size="sm" c="dimmed" mb="sm">
          Your password was reset. Please choose a new password to continue.
        </Text>
        <form onSubmit={newPwForm.onSubmit(setNewPassword)}>
          <Stack>
            <PasswordInput label="New password" {...newPwForm.getInputProps("next")} />
            <PasswordInput label="Re-enter new password" {...newPwForm.getInputProps("confirm")} />
            <Button type="submit" fullWidth loading={savingNew}>Save & continue</Button>
          </Stack>
        </form>
      </Modal>

      <Modal opened={forgotOpen} onClose={forgot.close} title="Reset password" centered>
        <Text size="sm" c="dimmed" mb="sm">
          Enter your phone number. If it's registered we'll SMS you a temporary password to sign in with.
        </Text>
        <TextInput
          label="Phone"
          placeholder="2547XXXXXXXX"
          inputMode="tel"
          value={resetPhone}
          onChange={(e) => setResetPhone(sanitizePhone(e.currentTarget.value))}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={forgot.close}>Cancel</Button>
          <Button loading={resetting} onClick={resetPassword}>Send temporary password</Button>
        </Group>
      </Modal>
    </Center>
  );
}
