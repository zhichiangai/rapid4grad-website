"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  QUIZ_QUESTIONS,
  type QuizOptionValue,
} from "@/lib/quiz/questions";
import { calculateRiskScore } from "@/lib/quiz/scorer";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { QuizChoiceCard } from "./QuizChoiceCard";
import { QuizNavigation } from "./QuizNavigation";
import { QuizProgressBar } from "./QuizProgressBar";

type QuizAnswers = Record<string, QuizOptionValue>;

interface QuizSubmitResponse {
  error?: string;
}

export function QuizContainer() {
  const router = useRouter();
  const autoAdvanceTimer = useRef<number | null>(null);

  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadEmail, setLeadEmail] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalQuestions = QUIZ_QUESTIONS.length;
  const currentQuestion = QUIZ_QUESTIONS[currentStep];
  const selectedValue = answers[currentQuestion.id] ?? null;
  const isLastStep = currentStep === totalQuestions - 1;
  const canGoBack = currentStep > 0 && !isSubmitting;
  const canGoNext = Boolean(selectedValue) && !isSubmitting;
  const hasLead = Boolean(leadId && leadEmail);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) {
        window.clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, []);

  const goToNextQuestion = useCallback(() => {
    setCurrentStep((step) => Math.min(step + 1, totalQuestions - 1));
  }, [totalQuestions]);

  const handleLeadSuccess = (nextLeadId: string, email: string) => {
    setLeadId(nextLeadId);
    setLeadEmail(email);
    setCurrentStep(0);
    setAnswers({});
    setSubmitError(null);
  };

  const handleSelect = (value: QuizOptionValue) => {
    setSubmitError(null);
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: value,
    }));

    if (autoAdvanceTimer.current) {
      window.clearTimeout(autoAdvanceTimer.current);
    }

    if (!isLastStep) {
      autoAdvanceTimer.current = window.setTimeout(() => {
        goToNextQuestion();
      }, 400);
    }
  };

  const handleBack = () => {
    if (autoAdvanceTimer.current) {
      window.clearTimeout(autoAdvanceTimer.current);
    }

    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleSubmit = async () => {
    if (!leadId || !leadEmail || !selectedValue) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = calculateRiskScore(answers);
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId,
          email: leadEmail,
          answers,
          score: result.score,
          riskLevel: result.riskLevel,
          tags: result.tags,
        }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as QuizSubmitResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "檢查結果送出失敗，請稍後再試。");
      }

      const params = new URLSearchParams({
        risk: result.riskLevel,
        tags: result.tags.join(","),
        score: String(result.score),
      });

      router.push(`/result?${params.toString()}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "系統暫時無法送出檢查結果。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasLead) {
    return (
      <div className="min-h-[calc(100vh-6rem)] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.22),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-12 text-white">
        <LeadCaptureForm onSuccess={handleLeadSuccess} />
      </div>
    );
  }

  return (
    <section className="min-h-[calc(100vh-6rem)] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.22),transparent_34rem),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 rounded-[2rem] border border-white/10 bg-slate-950/75 p-5 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-8">
        <QuizProgressBar current={currentStep + 1} total={totalQuestions} />

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-300">
            Question {currentStep + 1}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {currentQuestion.question}
          </h1>
          <p className="text-sm text-slate-400">
            已完成 {answeredCount} / {totalQuestions} 題。選擇最接近你目前狀態的答案。
          </p>
        </div>

        <QuizChoiceCard
          options={currentQuestion.options}
          selectedValue={selectedValue}
          onSelect={handleSelect}
          disabled={isSubmitting}
        />

        {submitError ? (
          <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {submitError}
          </p>
        ) : null}

        <QuizNavigation
          currentStep={currentStep}
          totalSteps={totalQuestions}
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          isLastStep={isLastStep}
          isSubmitting={isSubmitting}
          onBack={handleBack}
          onNext={goToNextQuestion}
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
}
