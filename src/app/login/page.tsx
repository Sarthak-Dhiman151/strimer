import type { Metadata } from "next";

import { LoginForm } from "@/app/login/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Log in · Strimer",
  description: "Log in or create a Strimer account with a one-time code.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Log in or sign up</CardTitle>
          <CardDescription>
            We email you a one-time code — no passwords.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
