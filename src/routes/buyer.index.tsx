import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/buyer/")({
  beforeLoad: () => {
    throw redirect({ to: "/buyer/dashboard" });
  },
});
