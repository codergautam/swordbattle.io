export function random(min: number, max: number) {
  return min + (Math.random() * (max - min));
}

export function isObject(item: any) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export function mergeDeep(target: any, ...sources: any): any {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

export function numberWithCommas(x: number) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function secondsToTime(duration: number) {
  const portions = [];

  const secInHour = 60 * 60;
  const hours = Math.trunc(duration / secInHour);
  if (hours > 0) {
    portions.push(hours + 'h');
    duration = duration - (hours * secInHour);
  }

  const secInMinute = 60;
  const minutes = Math.trunc(duration / secInMinute);
  if (minutes > 0) {
    portions.push(minutes + 'm');
    duration = duration - (minutes * secInMinute);
  }

  const seconds = Math.trunc(duration);
  if (seconds > 0) {
    portions.push(seconds + 's');
  }

  return portions.join(' ');
}

function humanReadable(seconds: number) {
  const timeUnits: any = [
    [60, 'seconds'],
    [60, 'minutes'],
    [24, 'hours'],
    [365, 'days'],
    [Infinity, 'years'],
  ];

  let unitIndex = 0;
  let time = seconds;

  while (time >= timeUnits[unitIndex][0] && unitIndex < timeUnits.length - 1) {
    time /= timeUnits[unitIndex][0];
    unitIndex++;
  }

  time = Math.floor(time);
  const unitName = timeUnits[unitIndex][1];
  return `${time} ${time === 1 ? unitName.slice(0, -1) : unitName}`;
}

export function sinceFrom(dateString: string) {
  const pastDate = new Date(dateString).getTime();
  const now = new Date().getTime();
  const secondsDiff = Math.floor((now - pastDate) / 1000);
  return humanReadable(secondsDiff);
}

export function lastSeen(dateString: string) {
  if (!dateString) return 'never';

  const inputDate = new Date(dateString);
  inputDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = today.getTime() - inputDate.getTime();
  const daysDiff = diff / (1000 * 60 * 60 * 24);

  if (daysDiff === 0) {
    return 'today';
  } else if (daysDiff === 1) {
    return 'yesterday';
  } else {
    return daysDiff + ' days ago';
  }
}

export function addCommas(num: number) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
