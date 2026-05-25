// Sample data for the design system's ReviewPanel demo.
// Mirrors the shape returned by GET /api/interactive-sessions/{code}/review.
import type { InteractiveSessionReviewResponse } from "../../store/BrainFlexApi";

export const reviewSampleData: InteractiveSessionReviewResponse = {
  interactiveSessionId: "demo-interactiveSession",
  roomCode: "DEMO00",
  endedAt: new Date().toISOString(),
  scoringEnabled: true,
  placements: [
    {
      playerId: "u1",
      user: { name: "Aragorn" },
      finalScore: 750,
      placement: 1,
      correctAnswers: 4,
      totalQuestions: 5,
    },
    {
      playerId: "u2",
      user: { name: "Legolas" },
      finalScore: 500,
      placement: 2,
      correctAnswers: 3,
      totalQuestions: 5,
    },
    {
      playerId: "u3",
      user: { name: "Gimli" },
      finalScore: 350,
      placement: 3,
      correctAnswers: 2,
      totalQuestions: 5,
    },
  ],
  rounds: [
    {
      round: 0,
      element: {
        kind: "Slide",
        id: "slide-0",
        slideKind: "TITLE",
        body: "A quick tour. Buckle up.",
        chrome: {
          title: "Welcome to BrainFlex",
          displaySeconds: 6,
          mediaPosition: "NONE",
        },
      },
      timedOutCount: 0,
      playerAnswers: [],
    },
    {
      round: 1,
      element: {
        kind: "McqQuestion",
        id: "mcq-1",
        prompt: "Which planet is known as the Red Planet?",
        options: [
          { id: "opt-1", text: "Venus" },
          { id: "opt-2", text: "Jupiter" },
          { id: "opt-3", text: "Mars" },
          { id: "opt-4", text: "Saturn" },
        ],
        correctOptionIds: ["opt-3"],
        pointValue: 100,
        difficulty: "EASY",
        chrome: {
          bestAnswerMode: false,
          bestAnswerPoints: 0,
          displaySeconds: 15,
          mediaPosition: "NONE",
        },
      },
      timedOutCount: 0,
      playerAnswers: [
        {
          playerId: "u1",
          userName: "Aragorn",
          payload: { kind: "McqAnswer", optionIds: ["opt-3"] },
          wasCorrect: true,
          pointsAwarded: 150,
        },
        {
          playerId: "u2",
          userName: "Legolas",
          payload: { kind: "McqAnswer", optionIds: ["opt-3"] },
          wasCorrect: true,
          pointsAwarded: 100,
        },
        {
          playerId: "u3",
          userName: "Gimli",
          payload: { kind: "McqAnswer", optionIds: ["opt-1"] },
          wasCorrect: false,
          pointsAwarded: 0,
        },
      ],
    },
    {
      round: 2,
      element: {
        kind: "TextQuestion",
        id: "text-1",
        prompt: "What is the capital of France?",
        correctAnswer: "Paris",
        acceptedVariants: [],
        caseSensitive: false,
        pointValue: 150,
        difficulty: "EASY",
        chrome: {
          bestAnswerMode: false,
          bestAnswerPoints: 0,
          displaySeconds: 15,
          mediaPosition: "NONE",
        },
      },
      timedOutCount: 0,
      playerAnswers: [
        {
          playerId: "u1",
          userName: "Aragorn",
          payload: { kind: "TextAnswer", text: "Paris" },
          wasCorrect: true,
          pointsAwarded: 150,
        },
        {
          playerId: "u2",
          userName: "Legolas",
          payload: { kind: "TextAnswer", text: "paris" },
          wasCorrect: true,
          pointsAwarded: 100,
        },
        {
          playerId: "u3",
          userName: "Gimli",
          payload: { kind: "TextAnswer", text: "Lyon" },
          wasCorrect: false,
          pointsAwarded: 0,
        },
      ],
    },
  ],
};
