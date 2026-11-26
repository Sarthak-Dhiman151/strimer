import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyForm } from "@/app/verify/verify-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Get verified · Strimer",
  description:
    "Verify your college email to earn the verified student or alumni badge.",
};

type CollegeOption = { id: string; name: string; email_domains: string[] };

async function VerifyContent() {
  let colleges: CollegeOption[] = [];
  let configured = true;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("colleges")
      .select("id, name, email_domains")
      .order("name");
    if (error) throw error;
    colleges = (data ?? []) as CollegeOption[];
  } catch {
    configured = false;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Get the verified badge</CardTitle>
        <CardDescription>
          We send a one-time code to your official college email. The badge
          unlocks reviews and placement reports for that college.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!configured ? (
          <p className="text-sm text-muted-foreground">
            Verification needs a configured Supabase environment. Copy{" "}
            <code>.env.example</code> to <code>.env.local</code> and reload.
          </p>
        ) : colleges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No colleges are listed yet — verification opens once colleges are
            added.
          </p>
        ) : (
          <VerifyForm colleges={colleges} />
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-10">
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
      >
        <VerifyContent />
      </Suspense>
    </div>
  );
}
