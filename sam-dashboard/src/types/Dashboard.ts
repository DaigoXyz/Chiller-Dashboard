export type ErrorLogItemDto = {
  time: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  pipelineStatus?: 'success' | 'failed' | 'running' | 'warning';  
};
