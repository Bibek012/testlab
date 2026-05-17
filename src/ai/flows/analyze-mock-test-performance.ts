'use server';
/**
 * @fileOverview An AI-powered tool that interprets mock test data to identify learning gaps
 * and recommends specific practice modules to improve rankings.
 *
 * - analyzeMockTestPerformance - A function that handles the AI analysis of mock test performance.
 * - AnalyzeMockTestPerformanceInput - The input type for the analyzeMockTestPerformance function.
 * - AnalyzeMockTestPerformanceOutput - The return type for the analyzeMockTestPerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeMockTestPerformanceInputSchema = z.object({
  testName: z.string().describe('The name of the mock test.'),
  totalQuestions: z.number().int().positive().describe('Total number of questions in the mock test.'),
  attemptedQuestions: z.number().int().min(0).describe('Number of questions attempted by the student.'),
  correctAnswers: z.number().int().min(0).describe('Number of correct answers.'),
  incorrectAnswers: z.number().int().min(0).describe('Number of incorrect answers.'),
  score: z.number().describe('The student\'s score in the mock test (e.g., percentage or raw score).'),
  timeTakenSeconds: z.number().int().positive().describe('Total time taken by the student to complete the test in seconds.'),
  topicsPerformance: z.array(z.object({
    topic: z.string().describe('Name of the topic.'),
    correct: z.number().int().min(0).describe('Number of correct answers in this topic.'),
    incorrect: z.number().int().min(0).describe('Number of incorrect answers in this topic.'),
    unattempted: z.number().int().min(0).describe('Number of unattempted questions in this topic.'),
    timeSpentSeconds: z.number().int().min(0).describe('Time spent on this topic in seconds.'),
  })).describe('Detailed performance breakdown by topic.'),
  overallFeedback: z.string().optional().describe('Any additional notes or feedback about the test performance.'),
});
export type AnalyzeMockTestPerformanceInput = z.infer<typeof AnalyzeMockTestPerformanceInputSchema>;

const AnalyzeMockTestPerformanceOutputSchema = z.object({
  summary: z.string().describe('An overall summary of the student\'s performance in the mock test.'),
  weakAreas: z.array(z.string()).describe('A list of specific weak areas identified from the test data (e.g., "Algebra", "Time Management", "Attention to Detail").'),
  recommendations: z.array(z.object({
    type: z.enum(['module', 'material', 'strategy']).describe('The type of recommendation (e.g., "module", "material", "strategy").'),
    title: z.string().describe('The title of the recommended practice module, study material, or strategy.'),
    reason: z.string().describe('A brief explanation of why this recommendation is relevant to the student\'s performance.'),
  })).describe('Specific recommendations for improvement.'),
  actionableInsights: z.array(z.string()).describe('Concrete, actionable steps the student can take immediately to address weak areas.'),
  estimatedImprovement: z.string().describe('An estimation of how addressing these areas might impact future scores and rankings.'),
});
export type AnalyzeMockTestPerformanceOutput = z.infer<typeof AnalyzeMockTestPerformanceOutputSchema>;

const analyzeMockTestPerformancePrompt = ai.definePrompt({
  name: 'analyzeMockTestPerformancePrompt',
  input: {schema: AnalyzeMockTestPerformanceInputSchema},
  output: {schema: AnalyzeMockTestPerformanceOutputSchema},
  prompt: `You are an AI-powered insight analyst for "Testlab", an online exam preparation platform. Your goal is to analyze a student's mock test performance, identify weak areas, and provide specific, actionable recommendations for improvement. Your analysis should be insightful, constructive, and aimed at helping the student efficiently improve their score and ranking.\n\nHere is the student's mock test performance data:\n\nTest Name: {{{testName}}}\nTotal Questions: {{{totalQuestions}}}\nAttempted Questions: {{{attemptedQuestions}}}\nCorrect Answers: {{{correctAnswers}}}\nIncorrect Answers: {{{incorrectAnswers}}}\nScore: {{{score}}}\nTime Taken: {{{timeTakenSeconds}}} seconds\n\nPerformance by Topic:\n{{#each topicsPerformance}}\n- Topic: {{{topic}}}\n  Correct: {{{correct}}}\n  Incorrect: {{{incorrect}}}\n  Unattempted: {{{unattempted}}}\n  Time Spent: {{{timeSpentSeconds}}} seconds\n{{/each}}\n\n{{#if overallFeedback}}\nAdditional Feedback: {{{overallFeedback}}}\n{{/if}}\n\nBased on this data, provide a comprehensive analysis.\n\nIdentify:\n1.  An overall summary of the student's performance.\n2.  Specific weak areas (e.g., "Algebra", "Time Management", "Conceptual Understanding in Physics").\n3.  Detailed recommendations, including specific practice modules, study materials, or learning strategies. For each recommendation, state its type (module, material, or strategy), a title, and a clear reason.\n4.  Actionable insights: concrete steps the student can take right away.\n5.  An estimation of how addressing these areas might impact their future scores and rankings.\n\nEnsure your output strictly adheres to the JSON format defined by the AnalyzeMockTestPerformanceOutputSchema.`,
});

const analyzeMockTestPerformanceFlow = ai.defineFlow(
  {
    name: 'analyzeMockTestPerformanceFlow',
    inputSchema: AnalyzeMockTestPerformanceInputSchema,
    outputSchema: AnalyzeMockTestPerformanceOutputSchema,
  },
  async (input) => {
    const {output} = await analyzeMockTestPerformancePrompt(input);
    return output!;
  }
);

export async function analyzeMockTestPerformance(input: AnalyzeMockTestPerformanceInput): Promise<AnalyzeMockTestPerformanceOutput> {
  return analyzeMockTestPerformanceFlow(input);
}
