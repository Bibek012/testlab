"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Search,
  Play,
  FileText,
  Clock,
  Target,
  LayoutGrid,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from "@/firebase";

import {
  collection,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface MockTestListProps {
  examId: string;
  examSlug: string;
  categorySlug: string;
}

const formatCompactNumber = (num: number) => {
  if (num >= 1000000)
    return (num / 1000000).toFixed(1).replace(".0", "") + "M+";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(".0", "") + "K+";
  return String(num);
};

export const MockTestList = ({
  examId,
  examSlug,
  categorySlug,
}: MockTestListProps) => {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedSubTypeId, setSelectedSubTypeId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ─────────────────────────────────────────────────────────
  // FETCH TYPES
  // ─────────────────────────────────────────────────────────
  const typesQuery = useMemoFirebase(
    () =>
      db
        ? query(
            collection(db, "exams", examId, "mockTypes"),
            orderBy("order", "asc")
          )
        : null,
    [db, examId]
  );
  const { data: mockTypes, loading: typesLoading } =
    useCollection<any>(typesQuery);

  useEffect(() => {
    if (mockTypes && mockTypes.length > 0 && !selectedTypeId) {
      setSelectedTypeId(mockTypes[0].id);
    }
  }, [mockTypes, selectedTypeId]);

  // ─────────────────────────────────────────────────────────
  // FETCH MOCKS
  // ─────────────────────────────────────────────────────────
  const mocksQuery = useMemoFirebase(
    () =>
      db
        ? query(
            collection(db, "mockTests"),
            where("examId", "==", examId),
            where("status", "==", "Published")
          )
        : null,
    [db, examId]
  );
  const { data: tests, loading: testsLoading } = useCollection<any>(mocksQuery);

  // ─────────────────────────────────────────────────────────
  // FETCH ATTEMPTS
  // BUG 2 FIX: loading state track karo — attempts load hone
  // se pehle galat "Start Test" button dikhne se rokne ke liye
  // ─────────────────────────────────────────────────────────
  const attemptsQuery = useMemoFirebase(
    () =>
      db && user
        ? query(
            collection(db, "users", user.uid, "mockAttempts"),
            where("examId", "==", examId),
            orderBy("completedAt", "desc")
          )
        : null,
    [db, user?.uid, examId]
  );
  const { data: attempts, loading: attemptsLoading } =
    useCollection<any>(attemptsQuery);

  // ─────────────────────────────────────────────────────────
  // FETCH ACTIVE SESSIONS
  // BUG 2 FIX: loading state track karo — activeSession load
  // hone se pehle "Resume Test" ki jagah "Start Test" dikhta tha
  // ─────────────────────────────────────────────────────────
  const activeSessionsQuery = useMemoFirebase(
    () =>
      db && user
        ? query(collection(db, "users", user.uid, "activeMocks"))
        : null,
    [db, user?.uid]
  );
  const { data: activeSessions, loading: activeSessionsLoading } =
    useCollection<any>(activeSessionsQuery);

  // ─────────────────────────────────────────────────────────
  // SUB TYPES
  // ─────────────────────────────────────────────────────────
  const mockSubTypes = useMemo(() => {
    if (!tests || !selectedTypeId) return [];
    const typeTests = tests.filter((t) => t.typeId === selectedTypeId);
    const map = new Map();
    typeTests.forEach((test) => {
      if (test.subTypeId && !map.has(test.subTypeId)) {
        map.set(test.subTypeId, {
          id: test.subTypeId,
          title: test.subTypeName || "Untitled",
        });
      }
    });
    return Array.from(map.values());
  }, [tests, selectedTypeId]);

  useEffect(() => {
    if (mockSubTypes.length > 0) {
      setSelectedSubTypeId(mockSubTypes[0].id);
    } else {
      setSelectedSubTypeId("all");
    }
  }, [mockSubTypes]);

  // ─────────────────────────────────────────────────────────
  // FILTERED TESTS
  // ─────────────────────────────────────────────────────────
  const filteredTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter((test) => {
      const matchesType = test.typeId === selectedTypeId;
      const matchesSubType =
        selectedSubTypeId === "all" || test.subTypeId === selectedSubTypeId;
      const matchesSearch = test.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesType && matchesSubType && matchesSearch;
    });
  }, [tests, selectedTypeId, selectedSubTypeId, searchQuery]);

  // ─────────────────────────────────────────────────────────
  // STATUS MAP
  // BUG 2 FIX: session.mockId ke saath session.id (document ID)
  // bhi fallback ke roop mein use karo — agar mockId field kisi
  // wajah se missing ho toh document ID se mapping ho jaaye
  // ─────────────────────────────────────────────────────────
  const mockStatusMap = useMemo(() => {
    const map: Record<string, { latestAttempt?: any; activeSession?: any }> =
      {};

    activeSessions?.forEach((session) => {
      // session.mockId = Firestore document mein saved field
      // session.id     = document ID (jo hamesha mockId hai)
      // Dono check karo taaki koi bhi miss na ho
      const key = session.mockId || session.id;
      if (key) {
        map[key] = { ...map[key], activeSession: session };
      }
    });

    attempts?.forEach((attempt) => {
      if (!map[attempt.mockId]?.latestAttempt) {
        map[attempt.mockId] = {
          ...map[attempt.mockId],
          latestAttempt: attempt,
        };
      }
    });

    return map;
  }, [attempts, activeSessions]);

  // ─────────────────────────────────────────────────────────
  // TOTALS
  // ─────────────────────────────────────────────────────────
  const totalMocks = tests?.length || 0;
  const totalQuestions =
    tests?.reduce((sum, mock) => sum + (mock.totalQuestions || 0), 0) || 0;

  // ─────────────────────────────────────────────────────────
  // REATTEMPT
  // BUG 1 FIX (bonus): Pehle handleReattempt mein
  // test_active localStorage key clear nahi ho rahi thi!
  // Isliye reattempt karne par bhi page directly 'test' step
  // par aa jaata tha (poori attempt reset nahi hoti thi).
  // ─────────────────────────────────────────────────────────
  const handleReattempt = async (mockId: string, baseUrl: string) => {
    if (!db || !user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "activeMocks", mockId));
      // FIXED: test_active bhi clear karo
      localStorage.removeItem(`test_active_${mockId}`);
      localStorage.removeItem(`test_progress_${mockId}`);
      localStorage.removeItem(`test_end_${mockId}`);
      localStorage.removeItem(`test_start_${mockId}`);
      window.location.href = baseUrl;
    } catch (e) {
      console.error(e);
    }
  };

  if (typesLoading && !mockTypes) {
    return <TestLibrarySkeleton />;
  }

  // ─────────────────────────────────────────────────────────
  // BUG 2 FIX: Jab tak attempts aur activeSessions dono load
  // nahi ho jaate, buttons ki jagah spinner dikhao.
  // Isse yeh problem khatam hogi ki data aane se pehle
  // "Start Test" dikhta tha jabki "Resume Test" dikhna chahiye tha.
  // ─────────────────────────────────────────────────────────
  const statusLoading = !!user && (attemptsLoading || activeSessionsLoading);

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 px-4 sm:px-6 raw-container">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
        <h2 className="text-xl font-bold flex items-center gap-2 whitespace-nowrap">
          <LayoutGrid className="w-4 h-4 text-primary" />
          Test Library
          {!testsLoading && (
            <span className="hidden sm:inline text-[10px] uppercase tracking-widest opacity-60 ml-2">
              ({totalMocks} Series •{" "}
              {formatCompactNumber(totalQuestions)} Questions)
            </span>
          )}
        </h2>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Find specific module..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-xl h-10 pl-10 pr-4 text-xs outline-none focus:border-primary/40 transition-all"
          />
        </div>
      </div>

      {/* TYPE TABS */}
      <div className="w-full overflow-x-auto hide-scrollbar flex">
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 gap-1 w-full sm:w-auto">
          {mockTypes?.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedTypeId(type.id)}
              className={cn(
                "flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap",
                selectedTypeId === type.id
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              {type.title}
            </button>
          ))}
        </div>
      </div>

      {/* SUB TYPES */}
      {selectedTypeId && mockSubTypes.length > 0 && (
        <div className="w-full overflow-x-auto hide-scrollbar">
          <div className="flex gap-2 min-w-max pb-1 pr-4">
            {mockSubTypes.map((sub: any) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubTypeId(sub.id)}
                className={cn(
                  "w-[130px] min-h-[80px] rounded-xl p-3 text-left border transition-all shrink-0 flex flex-col justify-between",
                  selectedSubTypeId === sub.id
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                    : "bg-white/5 border-white/5 hover:border-primary/30"
                )}
              >
                <div className="text-sm font-bold leading-tight line-clamp-2">
                  {sub.title}
                </div>
                <div className="text-[10px] opacity-70 mt-2">
                  {tests?.filter((t) => t.subTypeId === sub.id).length} Tests
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MOCK LIST */}
      <div className="w-full grid grid-cols-1 gap-3">
        {testsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-white/5 animate-pulse w-full"
            />
          ))
        ) : filteredTests.length === 0 ? (
          <div className="w-full py-12 text-center border border-dashed border-white/10 rounded-xl">
            <FileText className="w-8 h-8 text-muted-foreground opacity-10 mx-auto mb-2" />
            <p className="text-muted-foreground text-[11px] font-medium">
              No mocks available.
            </p>
          </div>
        ) : (
          filteredTests.map((test) => {
            const status = mockStatusMap[test.id] || {};
            const qCount = Number(test.totalQuestions) || 0;
            const marksPerQ = Number(test.marksPerQuestion) || 1;
            const totalMarks = test.fullMarks || qCount * marksPerQ;

            return (
              <div
                key={test.id}
                className="w-full bg-card border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-all box-border"
              >
                {/* TOP */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {test.isFree ? (
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px] px-1.5 py-0.5 uppercase">
                        Free
                      </Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] px-1.5 py-0.5 uppercase">
                        Live
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-base font-bold leading-tight break-words">
                    {test.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-primary/70" />
                      <span>{test.totalQuestions} Questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400/70" />
                      <span>{test.durationMinutes} Mins</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-emerald-400/70" />
                      <span>{totalMarks} Marks</span>
                    </div>
                  </div>
                </div>

                {/* DIVIDER */}
                <div className="h-px bg-white/5 my-3" />

                {/* BUTTONS */}
                <div className="flex gap-2 w-full">
                  {!user ? (
                    // Login nahi hai
                    <Button
                      onClick={() => {
                        const callback = encodeURIComponent(
                          window.location.pathname
                        );
                        router.push(`/signin?callbackUrl=${callback}`);
                      }}
                      className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold"
                    >
                      Login to Start
                    </Button>
                  ) : statusLoading ? (
                    // ─────────────────────────────────────────────
                    // BUG 2 FIX: Data load hone tak spinner dikhao
                    // Isse "Start Test" galat nahi dikhega
                    // ─────────────────────────────────────────────
                    <div className="w-full h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : status.activeSession ? (
                    // Active session hai — Resume dikhao
                    <Link
                      href={`/exams/${categorySlug}/${examSlug}/mock/${test.id}`}
                      className="w-full"
                    >
                      <Button className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Resume Test
                      </Button>
                    </Link>
                  ) : status.latestAttempt ? (
                    // Attempt complete hua — Reattempt + Result dikhao
                    <>
                      <Button
                        variant="outline"
                        onClick={() =>
                          handleReattempt(
                            test.id,
                            `/exams/${categorySlug}/${examSlug}/mock/${test.id}`
                          )
                        }
                        className="flex-1 h-10 rounded-xl border-white/10 text-xs font-bold"
                      >
                        Reattempt
                      </Button>
                      <Link
                        href={`/exams/${categorySlug}/${examSlug}/mock/${test.id}/result/${status.latestAttempt?.id}`}
                        className="flex-1"
                      >
                        <Button className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold">
                          Result
                        </Button>
                      </Link>
                    </>
                  ) : (
                    // Koi bhi session/attempt nahi — Start dikhao
                    <Link
                      href={`/exams/${categorySlug}/${examSlug}/mock/${test.id}`}
                      className="w-full"
                    >
                      <Button className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5">
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Start Test
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

function TestLibrarySkeleton() {
  return (
    <div className="space-y-4 px-4 w-full">
      <div className="h-5 w-24 bg-white/5 rounded animate-pulse" />
      <div className="h-10 w-full bg-white/5 rounded-xl animate-pulse" />
      <div className="space-y-2 w-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 w-full bg-white/5 rounded-xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
