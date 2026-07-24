import { emptySplitApi as api } from "../../../shared/store/emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    create: build.mutation<CreateApiResponse, CreateApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions`,
        method: "POST",
        body: queryArg.createSessionRequest,
      }),
    }),
    submitVote: build.mutation<SubmitVoteApiResponse, SubmitVoteApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/votes`,
        method: "POST",
        body: queryArg.submitVoteRequest,
      }),
    }),
    start: build.mutation<StartApiResponse, StartApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/start`,
        method: "POST",
      }),
    }),
    goToRound: build.mutation<GoToRoundApiResponse, GoToRoundApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/rounds/${queryArg.slideId}`,
        method: "POST",
      }),
    }),
    revealResults: build.mutation<
      RevealResultsApiResponse,
      RevealResultsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/rounds/${queryArg.slideId}/reveal-results`,
        method: "POST",
      }),
    }),
    revealResponses: build.mutation<
      RevealResponsesApiResponse,
      RevealResponsesApiArg
    >({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/rounds/${queryArg.slideId}/reveal-responses`,
        method: "POST",
      }),
    }),
    resumeTimer: build.mutation<ResumeTimerApiResponse, ResumeTimerApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/rounds/${queryArg.slideId}/resume-timer`,
        method: "POST",
      }),
    }),
    restartRound: build.mutation<RestartRoundApiResponse, RestartRoundApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/rounds/${queryArg.slideId}/restart`,
        method: "POST",
      }),
    }),
    answerQuestion: build.mutation<
      AnswerQuestionApiResponse,
      AnswerQuestionApiArg
    >({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/rounds/${queryArg.slideId}/questions/${queryArg.questionId}/host-answer`,
        method: "POST",
        body: queryArg.hostAnswerRequest,
      }),
    }),
    pauseTimer: build.mutation<PauseTimerApiResponse, PauseTimerApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/rounds/${queryArg.slideId}/pause-timer`,
        method: "POST",
      }),
    }),
    openVoting: build.mutation<OpenVotingApiResponse, OpenVotingApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/rounds/${queryArg.slideId}/open-voting`,
        method: "POST",
      }),
    }),
    closeRound: build.mutation<CloseRoundApiResponse, CloseRoundApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/rounds/${queryArg.slideId}/close`,
        method: "POST",
      }),
    }),
    reconnect: build.mutation<ReconnectApiResponse, ReconnectApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/reconnect`,
        method: "POST",
      }),
    }),
    leave: build.mutation<LeaveApiResponse, LeaveApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/leave`,
        method: "POST",
      }),
    }),
    heartbeat: build.mutation<HeartbeatApiResponse, HeartbeatApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/heartbeat`,
        method: "POST",
      }),
    }),
    end: build.mutation<EndApiResponse, EndApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/end`,
        method: "POST",
      }),
    }),
    uploadDrawing: build.mutation<
      UploadDrawingApiResponse,
      UploadDrawingApiArg
    >({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/drawings`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    cancel: build.mutation<CancelApiResponse, CancelApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/cancel`,
        method: "POST",
      }),
    }),
    submitAnswer: build.mutation<SubmitAnswerApiResponse, SubmitAnswerApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/answers`,
        method: "POST",
        body: queryArg.submitAnswerRequest,
      }),
    }),
    advance: build.mutation<AdvanceApiResponse, AdvanceApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/${queryArg.id}/advance`,
        method: "POST",
      }),
    }),
    join: build.mutation<JoinApiResponse, JoinApiArg>({
      query: (queryArg) => ({
        url: `/api/liveSessions/join`,
        method: "POST",
        body: queryArg.joinSessionRequest,
      }),
    }),
    snapshot: build.query<SnapshotApiResponse, SnapshotApiArg>({
      query: (queryArg) => ({ url: `/api/liveSessions/${queryArg.id}` }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as liveSessionApi };
export type CreateApiResponse = /** status 201 Created */ CreateSessionResponse;
export type CreateApiArg = {
  createSessionRequest: CreateSessionRequest;
};
export type SubmitVoteApiResponse = unknown;
export type SubmitVoteApiArg = {
  id: string;
  submitVoteRequest: SubmitVoteRequest;
};
export type StartApiResponse = unknown;
export type StartApiArg = {
  id: string;
};
export type GoToRoundApiResponse = unknown;
export type GoToRoundApiArg = {
  id: string;
  slideId: string;
};
export type RevealResultsApiResponse = unknown;
export type RevealResultsApiArg = {
  id: string;
  slideId: string;
};
export type RevealResponsesApiResponse = unknown;
export type RevealResponsesApiArg = {
  id: string;
  slideId: string;
};
export type ResumeTimerApiResponse = unknown;
export type ResumeTimerApiArg = {
  id: string;
  slideId: string;
};
export type RestartRoundApiResponse = unknown;
export type RestartRoundApiArg = {
  id: string;
  slideId: string;
};
export type AnswerQuestionApiResponse = unknown;
export type AnswerQuestionApiArg = {
  id: string;
  slideId: string;
  questionId: string;
  hostAnswerRequest: HostAnswerRequest;
};
export type PauseTimerApiResponse = unknown;
export type PauseTimerApiArg = {
  id: string;
  slideId: string;
};
export type OpenVotingApiResponse = unknown;
export type OpenVotingApiArg = {
  id: string;
  slideId: string;
};
export type CloseRoundApiResponse = unknown;
export type CloseRoundApiArg = {
  id: string;
  slideId: string;
};
export type ReconnectApiResponse = unknown;
export type ReconnectApiArg = {
  id: string;
};
export type LeaveApiResponse = unknown;
export type LeaveApiArg = {
  id: string;
};
export type HeartbeatApiResponse = unknown;
export type HeartbeatApiArg = {
  id: string;
};
export type EndApiResponse = unknown;
export type EndApiArg = {
  id: string;
};
export type UploadDrawingApiResponse = /** status 201 Created */ AppImage;
export type UploadDrawingApiArg = {
  id: string;
  body: {
    file: Blob;
  };
};
export type CancelApiResponse = unknown;
export type CancelApiArg = {
  id: string;
};
export type SubmitAnswerApiResponse = unknown;
export type SubmitAnswerApiArg = {
  id: string;
  submitAnswerRequest: SubmitAnswerRequest;
};
export type AdvanceApiResponse = /** status 200 OK */ AdvanceResponse;
export type AdvanceApiArg = {
  id: string;
};
export type JoinApiResponse = /** status 200 OK */ JoinSessionResponse;
export type JoinApiArg = {
  joinSessionRequest: JoinSessionRequest;
};
export type SnapshotApiResponse = /** status 200 OK */ SessionSnapshotResponse;
export type SnapshotApiArg = {
  id: string;
};
export type Placement = {
  start: number;
  end: number;
  top: number;
  bottom: number;
};
export type AppImage = {
  id?: string;
  external: boolean;
  srcKey?: string;
  externalSrc?: string;
  altText?: string;
  variants?: {
    [key: string]: string;
  };
  metadata?: {
    [key: string]: any;
  };
  placement?: Placement;
};
export type Avatar = {
  internalAvatarId?: string;
  image?: AppImage;
};
export type CreateSessionResponse = {
  sessionId?: string;
  publicId?: string;
  roomCode?: string;
  hostParticipantId?: string;
  displayName?: string;
  avatar?: Avatar;
};
export type CreateSessionRequest = {
  deckId: string;
};
export type SubmitVoteRequest = {
  slideId: string;
  optionId: string;
};
export type HostAnswerRequest = {
  answer?: string;
};
export type AnswerPayloadBase = {
  answerType: string;
};
export type AllocationAnswer = {
  answerType: "AllocationAnswer";
} & AnswerPayloadBase & {
    allocations?: {
      [key: string]: number;
    };
  };
export type AxisPoint = {
  x: number;
  y: number;
};
export type AxisAnswer = {
  answerType: "AxisAnswer";
} & AnswerPayloadBase & {
    placements?: {
      [key: string]: AxisPoint;
    };
  };
export type DrawingAnswer = {
  answerType: "DrawingAnswer";
} & AnswerPayloadBase & {
    image?: AppImage;
  };
export type FollowUpAnswer = {
  answerType: "FollowUpAnswer";
} & AnswerPayloadBase & {
    text?: string;
  };
export type GridAnswer = {
  answerType: "GridAnswer";
} & AnswerPayloadBase & {
    placements?: {
      [key: string]: string;
    };
  };
export type MatchingAnswer = {
  answerType: "MatchingAnswer";
} & AnswerPayloadBase & {
    matches?: {
      [key: string]: string;
    };
  };
export type McqAnswer = {
  answerType: "McqAnswer";
} & AnswerPayloadBase & {
    optionIds?: string[];
  };
export type NumberAnswer = {
  answerType: "NumberAnswer";
} & AnswerPayloadBase & {
    value?: number;
  };
export type PlaceOnImageAnswer = {
  answerType: "PlaceOnImageAnswer";
} & AnswerPayloadBase & {
    x?: number;
    y?: number;
  };
export type QAndAAnswer = {
  answerType: "QAndAAnswer";
} & AnswerPayloadBase & {
    question?: string;
  };
export type QuestionEntry = {
  id?: string;
  text?: string;
  askedAt?: string;
};
export type QAndAQuestions = {
  answerType: "QAndAQuestions";
} & AnswerPayloadBase & {
    questions?: QuestionEntry[];
  };
export type RankingAnswer = {
  answerType: "RankingAnswer";
} & AnswerPayloadBase & {
    orderedItemIds?: string[];
  };
export type ScalesAnswer = {
  answerType: "ScalesAnswer";
} & AnswerPayloadBase & {
    positions?: {
      [key: string]: number;
    };
  };
export type TextAnswer = {
  answerType: "TextAnswer";
} & AnswerPayloadBase & {
    text?: string;
  };
export type SubmitAnswerRequest = {
  slideId: string;
  payload:
    | AllocationAnswer
    | AxisAnswer
    | DrawingAnswer
    | FollowUpAnswer
    | GridAnswer
    | MatchingAnswer
    | McqAnswer
    | NumberAnswer
    | PlaceOnImageAnswer
    | QAndAAnswer
    | QAndAQuestions
    | RankingAnswer
    | ScalesAnswer
    | TextAnswer;
};
export type AdvanceResponse = {
  slideId?: string;
  terminal?: boolean;
};
export type JoinSessionResponse = {
  sessionId?: string;
  publicId?: string;
  participantId?: string;
  displayName?: string;
  avatar?: Avatar;
  joinedAt?: string;
};
export type JoinSessionRequest = {
  roomCode: string;
  displayName: string;
  avatar?: Avatar;
  colorTag?: string;
};
export type McqOptionView = {
  id?: string;
  optionType?: "TEXT" | "NUMBER" | "IMAGE";
  text?: string;
  imageUrl?: string;
  color?: string;
};
export type QAndAConfigView = {
  maxResponses?: number;
  moderated?: boolean;
};
export type GridItemView = {
  id?: string;
  label?: string;
  imageUrl?: string;
  color?: string;
};
export type GridConfigView = {
  rowLabels?: string[];
  colLabels?: string[];
  items?: GridItemView[];
};
export type AxisItemView = {
  id?: string;
  label?: string;
};
export type AxisConfigView = {
  xLowLabel?: string;
  xHighLabel?: string;
  yLowLabel?: string;
  yHighLabel?: string;
  items?: AxisItemView[];
};
export type ScaleItemView = {
  id?: string;
  label?: string;
};
export type ScalesConfigView = {
  min?: number;
  max?: number;
  leftLabel?: string;
  rightLabel?: string;
  items?: ScaleItemView[];
};
export type MatchCardView = {
  id?: string;
  label?: string;
  imageUrl?: string;
  color?: string;
};
export type MatchingConfigView = {
  left?: MatchCardView[];
  right?: MatchCardView[];
  scored?: boolean;
};
export type RankItemView = {
  id?: string;
  label?: string;
  imageUrl?: string;
  color?: string;
};
export type RankingConfigView = {
  items?: RankItemView[];
};
export type DrawingConfigView = {
  imagePromptUrl?: string;
  promptPlacement?: "ALONGSIDE" | "BACKGROUND";
  palette?: string[];
  tools?: ("PEN" | "ERASER" | "SHAPES" | "TEXT" | "COLOR_PALETTE")[];
};
export type TextConfigView = {
  maxLength?: number;
  wordCloud?: boolean;
};
export type NumberConfigView = {
  min?: number;
  max?: number;
  unit?: string;
};
export type PlaceOnImageConfigView = {
  imageUrl?: string;
};
export type AnswerSettingsView = {
  maxSelections?: number;
  displayResultsAsPercentage?: boolean;
  countdownTime?: number;
};
export type SlideView = {
  id?: string;
  title?: string;
  section?: string;
  participantInstructions?: string;
  backgroundColor?: string;
  hideBackground?: boolean;
  contentType?:
    | "MCQ"
    | "DRAWING"
    | "GRID"
    | "MATCHING"
    | "NUMBER"
    | "PLACE_ON_IMAGE"
    | "Q_AND_A"
    | "RANKING"
    | "SCALES"
    | "TEXT"
    | "ALLOCATION"
    | "AXIS"
    | "TITLE"
    | "CONTENT"
    | "MEDIA"
    | "INSTRUCTION"
    | "FOLLOW_UP";
  options?: McqOptionView[];
  qAndA?: QAndAConfigView;
  grid?: GridConfigView;
  axis?: AxisConfigView;
  scales?: ScalesConfigView;
  matching?: MatchingConfigView;
  ranking?: RankingConfigView;
  drawing?: DrawingConfigView;
  text?: TextConfigView;
  number?: NumberConfigView;
  placeOnImage?: PlaceOnImageConfigView;
  answerSettings?: AnswerSettingsView;
};
export type QAndAQuestionView = {
  id?: string;
  participantId?: string;
  text?: string;
  askedAt?: string;
  hostAnswer?: string;
};
export type VoteOptionView = {
  optionId?: string;
  text?: string;
  imageUrl?: string;
};
export type PlaceTargetView = {
  id?: string;
  x?: number;
  y?: number;
  radius?: number;
  label?: string;
  color?: string;
};
export type ScoreView = {
  points?: number;
  currentStreak?: number;
  totalCorrectAnswers?: number;
  bestAnswerPoints?: number;
  deceptionPoints?: number;
};
export type ParticipantView = {
  participantId?: string;
  displayName?: string;
  colorTag?: string;
  internalAvatarId?: string;
  connectionStatus?: "ONLINE" | "DISCONNECTED" | "IDLE" | "RECONNECTING";
  score?: ScoreView;
};
export type ScoreboardEntry = {
  participantId?: string;
  displayName?: string;
  points?: number;
  rank?: number;
};
export type SessionSnapshotResponse = {
  sessionId?: string;
  publicId?: string;
  roomCode?: string;
  status?: "LOBBY" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";
  phase?:
    | "SUBMIT"
    | "SUBMIT_LIVE"
    | "LOCKED"
    | "VOTE"
    | "REVEAL_RESPONSES"
    | "REVEAL_RESULTS";
  currentSlideId?: string;
  currentSlide?: SlideView;
  currentRoundStartedAt?: string;
  currentRoundDeadline?: string;
  currentRoundPausedAt?: string;
  optionTally?: {
    [key: string]: number;
  };
  qAndAQuestions?: QAndAQuestionView[];
  voteOptions?: VoteOptionView[];
  myVoteOptionId?: string;
  votesCast?: number;
  placeTargets?: PlaceTargetView[];
  roster?: ParticipantView[];
  scoreboard?: ScoreboardEntry[];
  viewerParticipantId?: string;
  viewerIsHost?: boolean;
  showRoomCodeInHeader?: boolean;
  showJoinInfoInResults?: boolean;
};
export const {
  useCreateMutation,
  useSubmitVoteMutation,
  useStartMutation,
  useGoToRoundMutation,
  useRevealResultsMutation,
  useRevealResponsesMutation,
  useResumeTimerMutation,
  useRestartRoundMutation,
  useAnswerQuestionMutation,
  usePauseTimerMutation,
  useOpenVotingMutation,
  useCloseRoundMutation,
  useReconnectMutation,
  useLeaveMutation,
  useHeartbeatMutation,
  useEndMutation,
  useUploadDrawingMutation,
  useCancelMutation,
  useSubmitAnswerMutation,
  useAdvanceMutation,
  useJoinMutation,
  useSnapshotQuery,
  useLazySnapshotQuery,
} = injectedRtkApi;
