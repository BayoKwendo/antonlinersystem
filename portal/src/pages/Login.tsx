import { Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { apiError } from "../api/client";

export default function Login() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { phone: "", password: "" },
    validate: {
      phone: (v) => (v.length < 7 ? "Enter your phone number" : null),
      password: (v) => (v.length < 4 ? "Enter your password" : null),
    },
  });

  async function submit(values: typeof form.values) {
    setLoading(true);
    try {
      await login(values.phone, values.password);
      navigate(location.state?.from?.pathname ?? "/", { replace: true });
    } catch (e) {
      notifications.show({ color: "red", title: "Login failed", message: apiError(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center mih="100vh" bg="brand.0">
      <Paper shadow="md" radius="lg" p="xl" w={380} withBorder>
        <Stack gap="xs" mb="md">
          <Title order={2} c="brand.8">AntonLiner</Title>
          <Text c="dimmed" size="sm">Smart Drilling — staff portal</Text>
        </Stack>
        <form onSubmit={form.onSubmit(submit)}>
          <Stack>
            <TextInput
              label="Phone"
              placeholder="2547XXXXXXXX"
              {...form.getInputProps("phone")}
            />
            <PasswordInput label="Password" placeholder="Your password" {...form.getInputProps("password")} />
            <Button type="submit" loading={loading} fullWidth mt="sm">Sign in</Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
