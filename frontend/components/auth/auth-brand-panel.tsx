"use client";

import Link from "next/link";
import { LoginLogo } from "@/components/auth/login-logo";

interface AuthBrandPanelProps {
  title: string;
  subtitle: string;
}

export function AuthBrandPanel({ title, subtitle }: AuthBrandPanelProps) {
  return (
    <div className="relative hidden min-h-screen flex-col justify-between overflow-hidden mosque-header px-10 py-12 text-cream lg:flex xl:px-14">
      <div className="relative z-10 max-w-lg space-y-6">
        <LoginLogo size={120} priority />
        <div className="space-y-3">
          <h1 className="font-serif text-3xl font-semibold tracking-tight xl:text-4xl">
            {title}
          </h1>
          <p className="text-base leading-relaxed text-cream/75">{subtitle}</p>
        </div>
      </div>

      <div className="relative z-10 space-y-5">
        <p className="font-arabic text-2xl leading-relaxed text-gold/90">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="text-sm tracking-wide text-cream/60">
          Structured Marḥalah courses · Exercises · Assessments
        </p>
        <Link
          href="/login?next=/admin"
          className="inline-flex text-sm text-gold/90 transition-colors hover:text-gold-light"
        >
          Admin sign in →
        </Link>
      </div>
    </div>
  );
}
