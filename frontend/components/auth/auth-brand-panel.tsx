"use client";

import Link from "next/link";
import { LoginLogo } from "@/components/auth/login-logo";

interface AuthBrandPanelProps {
  title: string;
  subtitle: string;
}

export function AuthBrandPanel({ title, subtitle }: AuthBrandPanelProps) {
  return (
    <div className="relative hidden min-h-screen flex-col justify-between overflow-hidden mosque-header p-8 text-cream lg:flex lg:p-12">
      <div className="relative z-10">
        <LoginLogo className="h-16 w-20 mb-8" />
        <h1 className="font-serif text-3xl font-bold tracking-tight xl:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-md text-cream/80 text-base">{subtitle}</p>
      </div>

      <div className="relative z-10 space-y-4">
        <p className="font-arabic text-gold text-2xl leading-relaxed">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="text-sm text-cream/70">
          Structured Marḥalah courses · Exercises · Assessments
        </p>
        <Link
          href="/admin"
          className="inline-block text-sm text-gold hover:text-gold-light transition-colors"
        >
          Admin panel →
        </Link>
      </div>
    </div>
  );
}
