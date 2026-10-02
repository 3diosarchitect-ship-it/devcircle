"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkillChip } from "@/components/shared/skill-chip";
import { UserAvatar } from "@/components/shared/user-avatar";
import { INITIAL_SKILLS, LOOKING_FOR_OPTIONS, type LookingFor } from "@/types";
import { isValidGithubUrl, isValidUrl } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const STEPS = [
  "Tell us about yourself",
  "What can you build?",
  "What are you looking for?",
  "Your developer links",
];

export function OnboardingWizard({
  initialName = "",
}: {
  initialName?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("");
  const [graduationYear, setGraduationYear] = useState(
    String(new Date().getFullYear() + 1)
  );
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<LookingFor[]>([]);
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  function toggleSkill(name: string) {
    setSkills((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }

  function toggleLooking(value: LookingFor) {
    setLookingFor((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  function validateStep(): boolean {
    if (step === 0) {
      if (!fullName.trim() || !college.trim() || !course.trim() || !city.trim()) {
        toast.error("Please fill name, college, course, and city");
        return false;
      }
    }
    if (step === 1 && skills.length === 0) {
      toast.error("Select at least one skill");
      return false;
    }
    if (step === 2 && lookingFor.length === 0) {
      toast.error("Select what you are looking for");
      return false;
    }
    if (step === 3) {
      if (githubUrl && !isValidGithubUrl(githubUrl)) {
        toast.error("GitHub URL must look like https://github.com/username");
        return false;
      }
      if (linkedinUrl && !isValidUrl(linkedinUrl)) {
        toast.error("Invalid LinkedIn URL");
        return false;
      }
      if (portfolioUrl && !isValidUrl(portfolioUrl)) {
        toast.error("Invalid portfolio URL");
        return false;
      }
    }
    return true;
  }

  async function finish() {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          avatar_url: avatarUrl,
          college,
          course,
          graduation_year: Number(graduationYear) || null,
          city,
          bio,
          skills,
          looking_for: lookingFor,
          github_url: githubUrl,
          linkedin_url: linkedinUrl,
          portfolio_url: portfolioUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const joined = (data.joined || [])
        .map((c: { name: string }) => c.name)
        .slice(0, 3)
        .join(", ");
      toast.success(
        joined
          ? `You're in! Joined ${joined}${data.joined.length > 3 ? "…" : ""}`
          : "Profile ready"
      );
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Onboarding failed");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (!validateStep()) return;
    if (step === STEPS.length - 1) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {STEPS[step]}
        </h1>
      </div>

      <div className="glass-card p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <UserAvatar name={fullName || "You"} src={avatarUrl || null} size="lg" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="avatar">Profile photo URL</Label>
                <Input
                  id="avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://… (optional)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="college">College / Institute</Label>
                <Input
                  id="college"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Input
                  id="course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="B.Tech CSE"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="year">Graduation year</Label>
                <Input
                  id="year"
                  type="number"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Short bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Building web products and exploring AI."
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              Select everything you can build with. We&apos;ll automatically add
              you to matching communities.
            </p>
            <div className="flex flex-wrap gap-2">
              {INITIAL_SKILLS.map((s) => (
                <SkillChip
                  key={s}
                  name={s}
                  selected={skills.includes(s)}
                  onClick={() => toggleSkill(s)}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {skills.length} selected
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {LOOKING_FOR_OPTIONS.map((o) => (
              <SkillChip
                key={o.value}
                name={o.label}
                selected={lookingFor.includes(o.value)}
                onClick={() => toggleLooking(o.value)}
              />
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Optional — you can add these later. GitHub OAuth import is coming
              next.
            </p>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub URL</Label>
              <Input
                id="github"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio URL</Label>
              <Input
                id="portfolio"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button
            variant="ghost"
            disabled={step === 0 || loading}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button onClick={next} disabled={loading}>
            {step === STEPS.length - 1 ? (
              <>
                {loading ? "Finishing..." : "Finish onboarding"}
                <Check className="size-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
