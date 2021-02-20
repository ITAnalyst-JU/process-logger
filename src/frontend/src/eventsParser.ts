import {ParseEvent, ParseOutputLine, ParseReturnValue, ParseSubprocess} from "./types";
import {humanReadableTime} from "./timeUtils";

export interface DataNode {
  nodeName: string,
  attributes: {
    time: {value: number},
    pid: {value: number},
    content: {value: string},
    childPid: {value: number},
    value: {value: number},
    fd: {value: number},
  },
  innerText: string
}

export function parseEvents(rawEventsList: HTMLElement | null): ParseEvent[] {
  if (rawEventsList) {
    const objects: ParseEvent[] = [];
    rawEventsList.childNodes.forEach((node) => {
      const parsed = parseEvent(node as unknown as DataNode);
      if (parsed) {
        objects.push(parsed);
      }
    });
    return objects;
  }
  return [];
}

export function parseEvent(node: DataNode): ParseEvent | undefined {
  if(node.nodeName === 'LINE'){
    return {
      time: humanReadableTime(node.attributes.time.value),
      pid: node.attributes.pid.value,
      eventType: "Output",
      fd: node.attributes.fd.value,
      content: node.innerText,
    } as ParseOutputLine
  }
  if(node.nodeName === 'SUBPROCESS'){
    return {
      time: humanReadableTime(node.attributes.time.value),
      pid: node.attributes.pid.value,
      eventType: "New process",
      childPid: node.attributes.childPid.value,
    } as ParseSubprocess
  }
  if(node.nodeName === 'RETURNVALUE'){
    return {
      time: humanReadableTime(node.attributes.time.value),
      pid: node.attributes.pid.value,
      eventType: "Process finished",
      returnValue: node.attributes.value.value,
    } as ParseReturnValue
  }
  return undefined;
}