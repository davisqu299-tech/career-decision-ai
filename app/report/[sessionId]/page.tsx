"use client";

import { use } from "react";
import { ReportClient } from "./report-client";

interface ReportPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function ReportPage({ params }: ReportPageProps) {
  const { sessionId } = use(params);
  return <ReportClient sessionId={sessionId} />;
}
