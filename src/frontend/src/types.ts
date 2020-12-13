export interface ParseEvent {
  time: number;
  pid: number;
  content: string;
}

export interface ParseOutputLine extends ParseEvent {
  fileDescriptor: number;
  content: string;
}

export interface ParseSubprocess extends ParseEvent {
  childPid: number;
}

export interface ParseReturnValue extends ParseEvent {
  value: number;
  // TODO: Maybe enum?
  signalName: string;
}

export enum TableColumn {
  Time,
  Pid,
  Content,
  // TODO: Add all possible.
}

export interface ColumnInfo {
  key: string;
  label: string;
}

export const columnsInfo: Map<TableColumn, ColumnInfo> = new Map([
  [TableColumn.Time, { label: "Time", key: "time" }],
  [TableColumn.Pid, { label: "Process ID", key: "pid" }],
  [TableColumn.Content, { label: "Output/Result", key: "content" }],
]);
