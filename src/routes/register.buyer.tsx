import { createFileRoute } from "@tanstack/react-router";
import { RegistrationForm } from "@/components/portal/registration-form";

export const Route = createFileRoute("/register/buyer")({
  head: () => ({
    meta: [{ title: "Buyer registration — Leo Infinity Trade Portal" }],
  }),
  component: () => <RegistrationForm variant="buyer" />,
});
