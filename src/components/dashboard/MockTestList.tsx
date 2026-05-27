"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Search,
  Play,
  FileText,
  Clock,
  Target,
  History,
  TrendingUp,
  LayoutGrid,
  RefreshCw,
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
  if (num >= 1000000) {
    return (
      (num / 1000000)
        .toFixed(1)
        .replace(".0", "") + "M+"
    );
  }

  if (num >= 1000) {
    return (
      (num / 1000)
        .toFixed(1)
        .replace(".0", "") + "K+"
    );
  }

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

  const [selectedTypeId, setSelectedTypeId] =
    useState("all");

  const [selectedSubTypeId, setSelectedSubTypeId] =
    useState("all");

  const [searchQuery, setSearchQuery] =
    useState("");

  // ======================
  // FETCH TYPES
  // ======================

  const typesQuery = useMemoFirebase(
    () =>
      db
        ? query(
            collection(
              db,
              "exams",
              examId,
              "mockTypes"
            ),
            orderBy("order", "asc")
          )
        : null,
    [db, examId]
  );

  const {
    data: mockTypes,
    loading: typesLoading,
  } = useCollection<any>(typesQuery);

  // ======================
  // FETCH MOCKS
  // ======================

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

  const {
    data: tests,
    loading: testsLoading,
  } = useCollection<any>(mocksQuery);

  // ======================
  // FETCH ATTEMPTS
  // ======================

  const attemptsQuery =
    useMemoFirebase(
      () =>
        db && user
          ? query(
              collection(
                db,
                "users",
                user.uid,
                "mockAttempts"
              ),
              where(
                "examId",
                "==",
                examId
              ),
              orderBy(
                "completedAt",
                "desc"
              )
            )
          : null,
      [db, user?.uid, examId]
    );

  const { data: attempts } =
    useCollection<any>(attemptsQuery);

  // ======================
  // FETCH ACTIVE MOCKS
  // ======================

  const activeSessionsQuery =
    useMemoFirebase(
      () =>
        db && user
          ? query(
              collection(
                db,
                "users",
                user.uid,
                "activeMocks"
              )
            )
          : null,
      [db, user?.uid]
    );

  const { data: activeSessions } =
    useCollection<any>(
      activeSessionsQuery
    );

  // ======================
  // SUB TYPES
  // ======================

  const mockSubTypes = useMemo(() => {

    if (
      !tests ||
      selectedTypeId === "all"
    ) {
      return [];
    }

    const typeTests =
      tests.filter(
        (t) =>
          t.typeId === selectedTypeId
      );

    const map = new Map();

    typeTests.forEach((test) => {

      if (
        test.subTypeId &&
        !map.has(test.subTypeId)
      ) {
        map.set(test.subTypeId, {
          id: test.subTypeId,
          title:
            test.subTypeName ||
            "Untitled",
        });
      }
    });

    return Array.from(map.values());

  }, [tests, selectedTypeId]);

  // ======================
  // FILTERED TESTS
  // ======================

  const filteredTests = useMemo(() => {

    if (!tests) return [];

    return tests.filter((test) => {

      const matchesType =
        selectedTypeId === "all" ||
        test.typeId ===
          selectedTypeId;

      const matchesSubType =
        selectedSubTypeId === "all" ||
        test.subTypeId ===
          selectedSubTypeId;

      const matchesSearch =
        test.title
          .toLowerCase()
          .includes(
            searchQuery.toLowerCase()
          );

      return (
        matchesType &&
        matchesSubType &&
        matchesSearch
      );
    });

  }, [
    tests,
    selectedTypeId,
    selectedSubTypeId,
    searchQuery,
  ]);

  // ======================
  // STATUS MAP
  // ======================

  const mockStatusMap = useMemo(() => {

    const map: Record<
      string,
      {
        latestAttempt?: any;
        activeSession?: any;
      }
    > = {};

    activeSessions?.forEach(
      (session) => {
        map[session.mockId] = {
          ...map[session.mockId],
          activeSession: session,
        };
      }
    );

    attempts?.forEach((attempt) => {

      if (
        !map[attempt.mockId]
          ?.latestAttempt
      ) {
        map[attempt.mockId] = {
          ...map[attempt.mockId],
          latestAttempt: attempt,
        };
      }
    });

    return map;

  }, [attempts, activeSessions]);

  // ======================
  // TOTALS
  // ======================

  const totalMocks =
    tests?.length || 0;

  const totalQuestions =
    tests?.reduce(
      (sum, mock) =>
        sum +
        (mock.totalQuestions || 0),
      0
    ) || 0;

  // ======================
  // REATTEMPT
  // ======================

  const handleReattempt = async (
    mockId: string,
    baseUrl: string
  ) => {

    if (!db || !user) return;

    try {

      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "activeMocks",
          mockId
        )
      );

      localStorage.removeItem(
        `test_progress_${mockId}`
      );

      localStorage.removeItem(
        `test_end_${mockId}`
      );

      localStorage.removeItem(
        `test_start_${mockId}`
      );

      window.location.href =
        baseUrl;

    } catch (e) {
      console.error(e);
    }
  };

  if (typesLoading && !mockTypes) {
    return <TestLibrarySkeleton />;
  }

  return (
    <div className="w-full space-y-5">

      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <h2 className="text-2xl font-bold flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          Test Library

          {!testsLoading && (
            <span className="hidden sm:inline text-[10px] uppercase tracking-widest opacity-60 ml-2">
              ({totalMocks} Series •{" "}
              {formatCompactNumber(
                totalQuestions
              )} Questions)
            </span>
          )}
        </h2>

        <div className="relative w-full md:w-72">

          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

          <input
            type="text"
            placeholder="Find specific module..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(
                e.target.value
              )
            }
            className="w-full bg-white/5 border border-white/5 rounded-xl h-12 pl-10 pr-4 text-sm outline-none focus:border-primary/40 transition-all"
          />
        </div>
      </div>

      {/* TYPE TABS */}

      <div className="w-full overflow-x-auto hide-scrollbar">

        <div className="flex min-w-max bg-white/5 p-1 rounded-xl border border-white/5 gap-1">

          <button
            onClick={() => {
              setSelectedTypeId("all");
              setSelectedSubTypeId(
                "all"
              );
            }}
            className={cn(
              "px-5 py-2 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap",

              selectedTypeId === "all"
                ? "bg-background text-primary"
                : "text-muted-foreground hover:text-white"
            )}
          >
            All Mocks
          </button>

          {mockTypes?.map((type) => (

            <button
              key={type.id}
              onClick={() => {

                setSelectedTypeId(
                  type.id
                );

                const firstSubtype =
                  tests?.find(
                    (t) =>
                      t.typeId === type.id
                  )?.subTypeId || "all";

                setSelectedSubTypeId(
                  firstSubtype
                );
              }}
              className={cn(
                "px-5 py-2 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap",

                selectedTypeId ===
                  type.id
                  ? "bg-background text-primary"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              {type.title}
            </button>

          ))}
        </div>
      </div>

      {/* SUB TYPES */}

      {selectedTypeId !== "all" &&
        mockSubTypes.length > 0 && (

          <div className="w-full overflow-x-auto hide-scrollbar">

            <div className="flex gap-3 min-w-max pb-1">

              {mockSubTypes.map(
                (sub: any) => (

                  <button
                    key={sub.id}
                    onClick={() =>
                      setSelectedSubTypeId(
                        sub.id
                      )
                    }
                    className={cn(
                      "w-[150px] min-h-[100px] rounded-2xl p-4 text-left border transition-all shrink-0 flex flex-col justify-between",

                      selectedSubTypeId ===
                        sub.id
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-white/5 border-white/5 hover:border-primary/30"
                    )}
                  >
                    <div className="text-base font-bold leading-snug line-clamp-2">
                      {sub.title}
                    </div>

                    <div className="text-xs opacity-70 mt-3">
                      {
                        tests?.filter(
                          (t) =>
                            t.subTypeId ===
                            sub.id
                        ).length
                      }{" "}
                      Tests
                    </div>
                  </button>

                )
              )}
            </div>
          </div>
        )}

      {/* MOCK LIST */}

      <div className="grid grid-cols-1 gap-4">

        {testsLoading ? (

          Array.from({
            length: 4,
          }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-white/5 animate-pulse"
            />
          ))

        ) : filteredTests.length ===
          0 ? (

          <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">

            <FileText className="w-10 h-10 text-muted-foreground opacity-10 mx-auto mb-3" />

            <p className="text-muted-foreground text-xs font-medium">
              No mocks available.
            </p>

          </div>

        ) : (

          filteredTests.map((test) => {

            const status =
              mockStatusMap[
                test.id
              ] || {};

            // FIXED MARKS LOGIC
            const totalMarks =
              test.fullMarks ||
              (
                (test.totalQuestions ||
                  0) *
                (test.marksPerQuestion ||
                  1)
              );

            return (

              <div
                key={test.id}
                className="w-full bg-card border border-white/5 rounded-2xl p-5 hover:border-primary/30 transition-all"
              >

                {/* TOP */}

                <div className="space-y-4">

                  <div className="flex items-center gap-2">

                    {test.isFree ? (
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] px-2 py-0.5 uppercase">
                        Free
                      </Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-2 py-0.5 uppercase">
                        Live
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-lg font-bold leading-snug">
                    {test.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground">

                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary/70" />
                      <span>
                        {
                          test.totalQuestions
                        } Questions
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400/70" />
                      <span>
                        {
                          test.durationMinutes
                        } Mins
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-400/70" />
                      <span>
                        {totalMarks} Marks
                      </span>
                    </div>

                  </div>
                </div>

                {/* DIVIDER */}

                <div className="h-px bg-white/5 my-5" />

                {/* BUTTONS */}

                <div className="flex gap-3">

                  {!user ? (

                    <Button
                      onClick={() => {

                        const callback =
                          encodeURIComponent(
                            window.location.pathname
                          );

                        router.push(
                          `/signin?callbackUrl=${callback}`
                        );
                      }}
                      className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold"
                    >
                      Login to Start
                    </Button>

                  ) : status.activeSession ? (

                    <Link
                      href={`/exams/${categorySlug}/${examSlug}/mock/${test.id}`}
                      className="w-full"
                    >
                      <Button className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Resume Test
                      </Button>
                    </Link>

                  ) : status.latestAttempt ? (

                    <>
                      <Button
                        variant="outline"
                        onClick={() =>
                          handleReattempt(
                            test.id,
                            `/exams/${categorySlug}/${examSlug}/mock/${test.id}`
                          )
                        }
                        className="flex-1 h-12 rounded-xl border-white/10 text-sm font-bold"
                      >
                        Reattempt
                      </Button>

                      <Link
                        href={`/exams/${categorySlug}/${examSlug}/mock/${test.id}/result/${status.latestAttempt?.id}`}
                        className="flex-1"
                      >
                        <Button className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold">
                          Result
                        </Button>
                      </Link>
                    </>

                  ) : (

                    <Link
                      href={`/exams/${categorySlug}/${examSlug}/mock/${test.id}`}
                      className="w-full"
                    >
                      <Button className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold gap-2">
                        <Play className="w-4 h-4 fill-current" />
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
    <div className="space-y-6">

      <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />

      <div className="h-12 w-full bg-white/5 rounded-xl animate-pulse" />

      <div className="space-y-3">

        {Array.from({
          length: 4,
        }).map((_, i) => (
          <div
            key={i}
            className="h-40 w-full bg-white/5 rounded-2xl animate-pulse"
          />
        ))}

      </div>
    </div>
  );
}
