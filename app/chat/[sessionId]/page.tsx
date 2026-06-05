"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { ChatClient } from "./chat-client";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatPageProps {
  params: Promise<{ sessionId: string }>;
}

function ChatPageInner({ sessionId }: { sessionId: string }) {
  const searchParams = useSearchParams();
  const initial = searchParams.get("initial") === "1";

  return <ChatClient sessionId={sessionId} autoSendInitial={initial} />;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { sessionId } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-neutral-50">
          <Skeleton className="h-8 w-48" />
        </div>
      }
    >
      <ChatPageInner sessionId={sessionId} />
    </Suspense>
  );
}
