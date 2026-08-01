import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/admn",
        destination: "/admin",
        permanent: false,
      },
      {
        source: "/admn/:path*",
        destination: "/admin/:path*",
        permanent: false,
      },
      {
        source: "/assessments",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/admin/exercises",
        destination: "/admin/topics",
        permanent: false,
      },
      {
        source: "/admin/exams",
        destination: "/admin/topics",
        permanent: false,
      },
      {
        source: "/teacher/exercises",
        destination: "/teacher/students",
        permanent: false,
      },
      {
        source: "/teacher/exercises/:path*",
        destination: "/teacher/students",
        permanent: false,
      },
      {
        source: "/teacher/exams",
        destination: "/teacher/students",
        permanent: false,
      },
      {
        source: "/teacher/exams/:path*",
        destination: "/teacher/students",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
