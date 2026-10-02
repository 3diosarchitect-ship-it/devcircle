import Link from "next/link";
import {
  ArrowRight,
  CircleDot,
  Code2,
  Sparkles,
  Users,
  Briefcase,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const FALLBACK_COMMUNITIES = [
  { name: "React Developers", slug: "react-developers", member_count: 12 },
  { name: "iOS Developers", slug: "ios-developers", member_count: 8 },
  { name: "Flutter Developers", slug: "flutter-developers", member_count: 7 },
  { name: "AI & ML Developers", slug: "ai-ml-developers", member_count: 9 },
  { name: "MERN Developers", slug: "mern-developers", member_count: 10 },
  { name: "Python Developers", slug: "python-developers", member_count: 6 },
];

const FALLBACK_OPPORTUNITIES = [
  {
    title: "React Intern",
    company: "NovaLabs (Demo)",
    type: "internship",
    skills: ["React", "TypeScript"],
    stipend: "₹25,000/mo",
    work_mode: "hybrid",
  },
  {
    title: "iOS Developer Intern",
    company: "AppleTree Studios (Demo)",
    type: "internship",
    skills: ["iOS", "Swift"],
    stipend: "₹30,000/mo",
    work_mode: "remote",
  },
  {
    title: "AI/ML Intern",
    company: "InsightAI (Demo)",
    type: "internship",
    skills: ["AI / ML", "Python"],
    stipend: "₹35,000/mo",
    work_mode: "hybrid",
  },
  {
    title: "MERN Developer Intern",
    company: "StackCurrents (Demo)",
    type: "internship",
    skills: ["MERN", "React", "Node.js"],
    stipend: "₹28,000/mo",
    work_mode: "hybrid",
  },
];

export default async function LandingPage() {
  let communities = FALLBACK_COMMUNITIES;
  let opportunities = FALLBACK_OPPORTUNITIES;
  let usingLiveData = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const [{ data: c }, { data: o }] = await Promise.all([
        supabase
          .from("communities")
          .select("name, slug, member_count")
          .order("member_count", { ascending: false })
          .limit(8),
        supabase
          .from("opportunities")
          .select("title, company, type, skills, stipend, work_mode")
          .order("created_at", { ascending: false })
          .limit(4),
      ]);
      if (c?.length) {
        communities = c;
        usingLiveData = true;
      }
      if (o?.length) {
        opportunities = o;
        usingLiveData = true;
      }
    } catch {
      // Keep fallbacks when Supabase is unreachable
    }
  }

  const steps = [
    {
      icon: Code2,
      title: "Create your developer profile",
      desc: "Skills, links, and what you can build — not just a resume upload.",
    },
    {
      icon: Users,
      title: "Get matched with communities",
      desc: "Pick React + Node.js and automatically join the right circles.",
    },
    {
      icon: Sparkles,
      title: "Discover people & projects",
      desc: "Find teammates, ask questions, and ship together.",
    },
    {
      icon: Rocket,
      title: "Build your proof of work",
      desc: "Projects and activity that show what you can actually build.",
    },
    {
      icon: Briefcase,
      title: "Get discovered",
      desc: "Opportunities matched to your skills — when you're ready.",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="border-b border-primary/20 bg-primary/10 px-4 py-2 text-center text-xs text-primary sm:text-sm">
        Student developer MVP demo · Sample communities & opportunities are
        labelled as demo data — not live job vacancies
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:py-5">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <CircleDot className="size-5" />
          </div>
          <span className="truncate text-lg font-semibold tracking-tight">
            DevCircle
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Join</Link>
          </Button>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:pb-20 sm:pt-14">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[420px] w-[min(100%,720px)] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-20 hidden h-64 w-64 rounded-full bg-[#5b8def]/10 blur-3xl sm:block" />
        </div>

        <p className="mb-3 text-sm font-medium tracking-wide text-primary">
          DevCircle
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl md:leading-[1.05]">
          Build. Connect.{" "}
          <span className="text-gradient">Get Opportunities.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          One place for developers to showcase what they can build, find their
          community, collaborate on projects, and discover opportunities matched
          to their skills.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <Link href="/register">
              Join as a Developer
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
            asChild
          >
            <Link href="#communities">Explore Communities</Link>
          </Button>
        </div>
      </section>

      <section className="border-y border-border bg-card/40 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            How it works
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Skills → communities → people → projects → opportunities.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title}>
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    Step {i + 1}
                  </div>
                  <h3 className="text-sm font-medium">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="communities"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:py-16"
      >
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Developer Communities
        </h2>
        <p className="mt-2 text-muted-foreground">
          Automatically join circles that match what you can build.
          {!usingLiveData && " Showing sample preview communities."}
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((c) => (
            <div
              key={c.slug}
              className="glass-card flex items-center justify-between px-4 py-4"
            >
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.member_count} members
                  {!usingLiveData ? " · sample" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-6" variant="outline" asChild>
          <Link href="/register">Join to enter communities</Link>
        </Button>
      </section>

      <section className="border-y border-border bg-card/40 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Opportunities
          </h2>
          <p className="mt-2 text-muted-foreground">
            Sample matched roles for the demo — clearly marked. These are not
            live vacancies.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {opportunities.map((o) => (
              <div key={o.title + o.company} className="glass-card p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    Demo Opportunity
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {o.type.replace("_", "-")} · {o.work_mode}
                  </span>
                </div>
                <h3 className="font-medium">{o.title}</h3>
                <p className="text-sm text-muted-foreground">{o.company}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(o.skills || []).slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                {o.stipend && (
                  <p className="mt-3 text-sm text-primary">{o.stipend}</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Button variant="outline" asChild>
              <Link href="/register">See matches for your skills</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Built for students who want to{" "}
          <span className="text-gradient">build</span>, not just apply.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Come for the communities and teammates. Stay because your proof of
          work grows — and opportunities find you.
        </p>
        <Button size="lg" className="mt-8 w-full sm:w-auto" asChild>
          <Link href="/register">
            Create your developer profile
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        DevCircle MVP · Temporary product name · Demo listings labelled clearly
      </footer>
    </div>
  );
}
