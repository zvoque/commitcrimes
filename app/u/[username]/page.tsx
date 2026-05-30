import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { getCrimeRecord } from "@/lib/github";
import { isClaimed } from "@/lib/store";
import ResultView from "@/components/ResultView";
import SiteFooter from "@/components/SiteFooter";
import BrandMark from "@/components/BrandMark";
import SuspectSearch from "@/components/SuspectSearch";
import { clerkClientEnabled as clerkEnabled } from "@/lib/config";

const SITE = "https://commitcrimes.dev";

const load = cache(getCrimeRecord);
// Deduped across generateMetadata + the page render in one request.
const claimedOf = cache(isClaimed);

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

  const title = `@${record.login} on CommitCrimes: ${record.sentence.text}`;
  // Parody-wrap so any out-of-context search/social snippet self-identifies as
  // satire, not a factual assertion about the person.
  const description = `Satire: ${record.sentence.headline.replace(/\.?$/, ".")} A parody CommitCrimes rap sheet from public GitHub activity. Not a real record.`;
  const ogImage = `/api/og?u=${record.login}`;
  // Index CONSENTED records only. A claimed record means the subject signed in
  // as themselves and opted in, which is the safe set to let search engines
  // amplify. Unclaimed records stay viewable by direct link (parody) but
  // noindexed, so we never promote unconsented statements about real people.
  // Virality is unaffected: shares are direct links + OG cards, not search.
  const claimed = await claimedOf(username).catch(() => false);
  const indexable = claimed;

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
    ? await Promise.all([viewerOwns(username), claimedOf(username)])
    : [false, false];

  // Only emit structured data for consented (claimed) records — same posture as
  // indexing. Never assert facts about a person who did not opt in.
  const breadcrumbLd = record && claimed
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "CommitCrimes", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Most Wanted", item: `${SITE}/wanted` },
          {
            "@type": "ListItem",
            position: 3,
            name: `@${record.login}`,
            item: `${SITE}/u/${record.login}`,
          },
        ],
      }
    : null;

  return (
    <main className="paper-bg relative flex flex-1 flex-col items-center overflow-hidden px-5 pt-5 pb-10 sm:pb-14">
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      )}
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
      <div className="mt-6 text-left">
        <SuspectSearch compact />
      </div>
      <Link
        href="/wanted"
        className="mt-4 inline-block text-sm uppercase tracking-[0.14em] text-ink-soft underline decoration-dotted underline-offset-4 hover:text-stamp"
      >
        Or see the Most Wanted &rarr;
      </Link>
    </div>
  );
}
