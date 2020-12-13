import {ParseEvent} from "./types";

export function parseEvents(rawEventsList: HTMLElement | null): ParseEvent[] {
  if (rawEventsList) {
    const objects: ParseEvent[] = [];
    console.log(rawEventsList.childNodes);
    rawEventsList.childNodes.forEach((node) => {
      const parsed = parseEvent(node);
      if (parsed) {
        objects.push(parsed);
      }
    });
    return objects;
  }
  return [];
}

function parseEvent(node: ChildNode): ParseEvent | undefined {
  // TODO: Temporary solution
  // TODO: This whole function needs to be refactored.
  const tmpNode = node as ChildNode & {
    attributes: {
      time: {value: number},
      pid: {value: number},
      content: {value: string},
      childPid: {value: string},
      value: {value: number}
    },
    innerText: string
  }
  if(tmpNode.nodeName === 'LINE'){
    return {
      time: tmpNode.attributes.time.value,
      pid: tmpNode.attributes.pid.value,
      content: tmpNode.innerText,
    }
  }
  if(tmpNode.nodeName === 'SUBPROCESS'){
    return {
      time: tmpNode.attributes.time.value,
      pid: tmpNode.attributes.pid.value,
      content: tmpNode.attributes.childPid.value,
    }
  }
  if(tmpNode.nodeName === 'RETURNVALUE'){
    return {
      time: tmpNode.attributes.time.value,
      pid: tmpNode.attributes.pid.value,
      content: tmpNode.attributes.value.value.toString(),
    }
  }
  return undefined;
}