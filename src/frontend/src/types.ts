export interface ParseEvent {
  time: number;
  pid: number;
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

export enum ColumnNames {
  Time,
  Pid,
  Content,
  // TODO: Add all possible.
}

export const columnsDisplayNames: Map<ColumnNames, string> = new Map([
  [ColumnNames.Time, "Time"],
  [ColumnNames.Pid, "Process ID"],
  [ColumnNames.Content, "Output/Result"],
]);
