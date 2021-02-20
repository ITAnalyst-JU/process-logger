export function humanReadableTime(timestamp: number): string {
  let date = new Date(timestamp / 1000);
  let hours = "00" + date.getHours();
  let minutes = "00" + date.getMinutes();
  let seconds = "00" + date.getSeconds();
  return `${hours.substr(-2)}:${minutes.substr(-2)}:${seconds.substr(-2)}`;
}