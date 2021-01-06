export interface ParseEvent {
  time: string;
  pid: number;
  eventType: string;
}

export interface ParseOutputLine extends ParseEvent {
  fd: number;
  content: string;
}

export interface ParseSubprocess extends ParseEvent {
  childPid: number;
}

export interface ParseReturnValue extends ParseEvent {
  returnValue: number;
  // TODO: Maybe enum?
  signalName: string;
}

export enum TableColumn {
  Time,
  Pid,
  Content,
  EventType,
  FileDescriptor,
  ChildPid,
  SignalName,
  ReturnValue
  // TODO: Add all possible.
}

export interface ColumnInfo {
  key: string;
  label: string;
}

export const columnsInfo: Map<TableColumn, ColumnInfo> = new Map([
  [TableColumn.Time, { label: "Time", key: "time" }],
  [TableColumn.Pid, { label: "Process ID", key: "pid" }],
  [TableColumn.Content, { label: "Output", key: "content" }],
  [TableColumn.EventType, { label: "Event", key: "eventType" }],
  [TableColumn.FileDescriptor, { label: "Output fd", key: "fd" }],
  [TableColumn.ChildPid, { label: "New process PID", key: "childPid" }],
  [TableColumn.SignalName, { label: "Signal Name", key: "signalName" }],
  [TableColumn.ReturnValue, { label: "Return Value", key: "returnValue" }],
]);
