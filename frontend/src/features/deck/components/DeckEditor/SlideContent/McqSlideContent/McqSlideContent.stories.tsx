import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { UseMcqEditorResult, McqQuestionView } from "@deck/hooks/useMcqEditor";
import { McqOptionEditingProvider } from "@deck/contexts/McqOptionEditingContext";
import { mockMcqSlide } from "@deck/utils/deckMockData";
import { withSlideCanvas } from "@sb/decorators/withSlideCanvas";
import { McqSlideContentView } from "./McqSlideContentView";

// Flatten the mock slide into the view-facing question shape useMcqEditor would
// synthesize. Narrow the content union so we can read the MCQ arm.
const content = mockMcqSlide.content;
const mockQuestion: McqQuestionView = {
  id: mockMcqSlide.id,
  prompt: mockMcqSlide.title,
  options: content.contentType === "MCQ" ? content.options : [],
  correctOptionIds: content.contentType === "MCQ" ? content.correctOptionIds : [],
  dataVisualization:
    content.contentType === "MCQ" ? (content.dataVisualization ?? "NONE") : "NONE",
};

// A pure stand-in for useMcqEditor's surface — no store, router, or modal. Write
// handlers are spies; predicates derive from the mock question.
const mockEditor: UseMcqEditorResult = {
  question: mockQuestion,
  schedulePrompt: fn(),
  flush: fn(),
  canAddOption: true,
  addOption: fn(),
  handleOptionDragEnd: fn(),
  setDataVisualization: fn(),
  canRemove: true,
  isCorrect: (id) => mockQuestion.correctOptionIds.includes(id ?? ""),
  scheduleOption: fn(),
  commitOption: fn(),
  toggleCorrect: fn(),
  removeOption: fn(),
};

const meta = {
  title: "Deck/SlideContent/McqSlideContent",
  component: McqSlideContentView,
  tags: ["autodocs"],
  decorators: [
    // The option pieces (card / chart label) read editing off the per-option
    // context, so the view needs the provider the container normally mounts.
    (Story) => (
      <McqOptionEditingProvider editor={mockEditor} openPicker={fn()}>
        <Story />
      </McqOptionEditingProvider>
    ),
    withSlideCanvas("MCQ"),
  ],
  args: {
    UseMcqEditorResult: mockEditor,
  },
} satisfies Meta<typeof McqSlideContentView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyState: Story = {
  args: {
    UseMcqEditorResult: { ...mockEditor, question: undefined },
  },
};
