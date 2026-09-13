import { createFileRoute } from "@tanstack/react-router";
import { RegistrationForm } from "@/components/portal/registration-form";

export const Route = createFileRoute("/register/vendor")({
  head: () => ({
    meta: [{ title: "Vendor registration — Leo Infinity Trade Portal" }],
  }),
  component: () => <RegistrationForm variant="vendor" />,
});
