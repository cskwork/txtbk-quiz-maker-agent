// Claude Agent SDK 타입 정의
// SDK 메시지 및 에러 타입

// SDK 시스템 메시지
export interface SDKSystemMessage {
  type: 'system';
  subtype: 'init' | 'completion';
  session_id: string;
  skills?: string[];
}

// 콘텐츠 블록 (assistant 메시지용)
export interface ContentBlock {
  type: 'text' | 'tool_use';
  text?: string;
  name?: string;
  input?: unknown;
}

// SDK Assistant 메시지
export interface SDKAssistantMessage {
  type: 'assistant';
  content: string | ContentBlock[];
}

// SDK 도구 호출 메시지
export interface SDKToolCallMessage {
  type: 'tool_call';
  tool_name: string;
  input: Record<string, unknown>;
}

// SDK 도구 결과 메시지
export interface SDKToolResultMessage {
  type: 'tool_result';
  tool_name: string;
  result: string;
}

// SDK 에러 메시지
export interface SDKErrorMessage {
  type: 'error';
  error: {
    type: string;
    message: string;
    tool?: string;
  };
}

// SDK 메시지 유니온 타입
export type SDKMessage =
  | SDKSystemMessage
  | SDKAssistantMessage
  | SDKToolCallMessage
  | SDKToolResultMessage
  | SDKErrorMessage;

// 지원 모델
export type AgentModel = 'claude-sonnet-4-5' | 'claude-opus-4-5';

// 권한 모드
export type PermissionMode = 'default' | 'acceptEdits' | 'plan';

// Agent 쿼리 옵션
export interface AgentQueryOptions {
  model?: AgentModel;
  systemPrompt?: string;
  permissionMode?: PermissionMode;
  maxBudgetUsd?: number;
  allowedTools?: string[];
  workingDirectory?: string;
  resume?: string;
  forkSession?: boolean;
}

// 내부 Agent 메시지 (기존 코드와 호환)
export interface AgentMessage {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'system';
  content: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// Agent 세션
export interface AgentSession {
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
  status: 'active' | 'completed' | 'error';
}

// 에러 코드
export type AgentErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'PERMISSION_DENIED'
  | 'PARSE_ERROR'
  | 'UNKNOWN_ERROR';

// Agent 에러 클래스
export class AgentError extends Error {
  constructor(
    message: string,
    public code: AgentErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AgentError';
  }
}
