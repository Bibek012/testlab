import { z } from 'zod';

/**
 * @fileOverview Strict validation and normalization for Mock Test JSON files (Testbook Style).
 */

const BilingualContent = z.union([
  z.string(),
  z.object({
    en: z.string().optional(),
    hn: z.string().optional(),
    en_html: z.string().optional(),
    hn_html: z.string().optional(),
  })
]);

const OptionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  en: z.string().optional(),
  hn: z.string().optional(),
  en_html: z.string().optional(),
  hn_html: z.string().optional(),
});

const QuestionSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  question: BilingualContent,
  options: z.array(OptionSchema).min(2, "At least 2 options required"),
  answer: z.union([z.string(), z.number()]).optional(),
  raw_answer_id: z.union([z.string(), z.number()]).optional(),
  marks: z.object({
    positive: z.number().optional(),
    negative: z.number().optional(),
  }).optional(),
  explanation: BilingualContent.optional(),
  dom_images: z.array(z.string()).optional(),
}).refine(q => q.answer !== undefined || q.raw_answer_id !== undefined, {
  message: "Correct answer (answer or raw_answer_id) is missing"
});

const SectionSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  title: z.union([z.string(), z.object({ en: z.string(), hn: z.string().optional() })]),
  questions: z.array(QuestionSchema).min(1, "Section must contain at least one question"),
});

const RootMockSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  sections: z.array(SectionSchema).min(1, "At least one section is required"),
});

export interface NormalizedQuestion {
  id: string;
  en: string;
  hn: string;
  en_html: string;
  hn_html: string;
  options: any[];
  correctOptionId: number;
  raw_answer_id: number;
  marks: {
    positive: number;
    negative: number;
    skip: number;
  };
  explanation: {
    en: string;
    hn: string;
    en_html: string;
    hn_html: string;
  };
  dom_images: string[];
}

export interface NormalizedSection {
  id: string;
  title: { en: string; hn: string };
  questions: NormalizedQuestion[];
}

export interface NormalizedMockTest {
  title: string;
  sections: NormalizedSection[];
  totalQuestions: number;
}

/**
 * Validates raw JSON and returns a normalized structure for Firestore.
 */
export function validateAndNormalizeMockTest(json: any): { success: true; data: NormalizedMockTest } | { success: false; error: string } {
  try {
    const validated = RootMockSchema.parse(json);
    let totalQuestions = 0;

    const normalizedSections: NormalizedSection[] = validated.sections.map((section, sIdx) => {
      const sectionId = String(section.id || `section_${sIdx}`);
      const sectionTitle = typeof section.title === 'string' ? { en: section.title, hn: section.title } : { en: section.title.en, hn: section.title.hn || section.title.en };

      const questions: NormalizedQuestion[] = section.questions.map((q, qIdx) => {
        totalQuestions++;
        const questionId = String(q.id || `q_${sIdx}_${qIdx}`);
        
        // Normalize Question Content
        const baseQ = typeof q.question === 'string' ? { en: q.question, hn: "", en_html: q.question, hn_html: "" } : {
          en: q.question.en || "",
          hn: q.question.hn || "",
          en_html: q.question.en_html || q.question.en || "",
          hn_html: q.question.hn_html || q.question.hn || ""
        };

        // Normalize Options
        const options = q.options.map((opt, oIdx) => ({
          id: Number(opt.id) || oIdx + 1,
          en: opt.en || "",
          hn: opt.hn || "",
          en_html: opt.en_html || opt.en || "",
          hn_html: opt.hn_html || opt.hn || ""
        }));

        // Resolve Correct Answer
        let correctOptionId = 0;
        if (q.raw_answer_id !== undefined) {
          correctOptionId = Number(q.raw_answer_id);
        } else if (q.answer !== undefined) {
          const match = options.find(o => o.en === q.answer || o.en_html === q.answer);
          correctOptionId = match ? match.id : (Number(q.answer) || 0);
        }

        // Normalize Explanation
        const baseExp = !q.explanation ? { en: "", hn: "", en_html: "", hn_html: "" } :
          typeof q.explanation === 'string' ? { en: q.explanation, hn: "", en_html: q.explanation, hn_html: "" } : {
            en: q.explanation.en || "",
            hn: q.explanation.hn || "",
            en_html: q.explanation.en_html || q.explanation.en || "",
            hn_html: q.explanation.hn_html || q.explanation.hn || ""
          };

        return {
          id: questionId,
          ...baseQ,
          options,
          correctOptionId,
          raw_answer_id: correctOptionId,
          marks: {
            positive: Number(q.marks?.positive ?? 1),
            negative: Number(q.marks?.negative ?? 0.33),
            skip: 0
          },
          explanation: baseExp,
          dom_images: q.dom_images || []
        };
      });

      return { id: sectionId, title: sectionTitle, questions };
    });

    return {
      success: true,
      data: {
        title: validated.title,
        sections: normalizedSections,
        totalQuestions
      }
    };
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const firstError = err.errors[0];
      return { success: false, error: `${firstError.path.join(' -> ')}: ${firstError.message}` };
    }
    return { success: false, error: err.message || "Unknown validation error" };
  }
}
