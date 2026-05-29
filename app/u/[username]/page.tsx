import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { getCrimeRecord } from "@/lib/github";
import { isClaimed } from "@/lib/store";
import ResultView from "@/components/ResultView";
import SiteFooter from "@/components/SiteFooter";
import BrandMark from "@/components/BrandMark";
import { clerkClientEnabled as clerkEnabled } from "@/lib/config";

const load = cache(getCrimeRecord);

// True only when the signed-in viewer's GitHub handle matches this record, so
// the badge snippet is offered to the owner alone. Uses the Clerk external
// account username (no extra GitHub call).
async function viewerOwns(login: string): Promise<boolean> {
  if (!clerkEnabled) return false;
  try {
    const u = await currentUser();
    const handle = u?.externalAccounts?.find((a) => /github/i.test(a.provider))?.username;
    return !!handle && handle.toLowerCase() === login.toLowerCase();
  } catch {
    return false;
  }
}

export async function generateMetadata(
  props: PageProps<"/u/[username]">
): Promise<Metadata> {
  const { username } = await props.params;
  const record = await load(username).catch(() => null);

  if (!record) {
    return { title: `No record found · CommitCrimes`, robots: { index: false, follow: true } };
  }

  const title = `@${record.login}: ${record.sentence.text} · CommitCrimes`;
  const description = record.sentence.headline;
  const ogImage = `/api/og?u=${record.login}`;
  // Index records with actual charges; keep thin/clean ones out of the index
  // (avoids bloat from every transiently-looked-up handle).
  const indexable = record.charges.length > 0;

  return {
    title,
    description,
    alternates: { canonical: `/u/${record.login}` },
    robots: { index: indexable, follow: true },
    openGraph: {
      title,
      description,
      url: `/u/${record.login}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      site: "@gitmostwanted",
      creator: "@zvoque",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function SuspectPage(props: PageProps<"/u/[username]">) {
  const { username } = await props.params;
  const record = await load(username).catch(() => null);
  const [owner, claimed] = record
    ? await Promise.all([viewerOwns(username), isClaimed(username)])
    : [false, false];

  return (
    <main className="paper-bg relative flex flex-1 flex-col items-center overflow-hidden px-5 pt-5 pb-10 sm:pb-14">
      <div className="grain-overlay" />

      <BrandMark className="relative z-10 mb-8 self-start" />

      <div className="relative z-10 flex w-full justify-center">
        {record ? (
          <ResultView record={record} isOwner={owner} claimed={claimed} />
        ) : (
          <NoRecord username={username} />
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function NoRecord({ username }: { username: string }) {
  return (
    <div className="w-full max-w-md border-2 border-ink bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-8 text-center shadow-[8px_8px_0_0_rgba(20,16,10,0.5)]">
      <p className="font-stencil text-4xl text-ink">Case Dismissed</p>
      <p className="mt-3 text-ink-soft">
        No record found for{" "}
        <span className="text-ink">@{username.slice(0, 40)}</span>. Either
        they&apos;re clean, in hiding, or never existed.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block border-2 border-ink bg-ink px-5 py-2 text-sm uppercase tracking-[0.16em] text-paper font-stencil"
      >
        Book someone else
      </Link>
    </div>
  );
}
