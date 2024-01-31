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

export function fixDate(inputDate: Date) {
  // https://stackoverflow.com/a/14569783
  // return  new Date( inputDate.getTime() + Math.abs(inputDate.getTimezoneOffset()*60000) )
  return inputDate;
}

export function lastSeen(dateString: string) {
  if (!dateString) return 'never';

  let inputDate = new Date(dateString);
  inputDate = fixDate(inputDate);
  inputDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);


  const diff = (today as any) - (inputDate as any);

  const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

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

export function calculateGemsXP(coins: number, kills: number) {
  const xp = Math.floor(coins / 20) + kills
  return {
    xp,
    gems: Math.floor(xp / 5)
  }
}

export function buyFormats(amount: number) {
  const values = ['<5', '<10', '10+', '20+', '50+', '100+', '200+', '500+', '1K+', '2K+', '5K+', '10K+', '20K+', '50K+', '100K+', '200K+', '500K+', '1M+', '2M+', '5M+', '10M+'];

  const amountToNumber = (val: string) => {
    const num = parseFloat(val.replace(/[<+KM]/g, ''));
    return val.includes('M') ? num * 1000000 : val.includes('K') ? num * 1000 : num;
  };

  for (let i = 0; i < values.length; i++) {
    const current = values[i];
    const next = i + 1 < values.length ? values[i + 1] : null;

    const currentVal = amountToNumber(current);
    const nextVal = next ? amountToNumber(next) : Infinity;

    if ((current.includes('<') && amount < currentVal) ||
        (!current.includes('<') && amount >= currentVal && amount < nextVal)) {
      return current;
    }
  }

  return values[values.length - 1];
}

export function getCookies() {
  const cookies: any = {};
  document.cookie.split(';').forEach((cookie) => {
    const [key, value] = cookie.split('=');
    cookies[key.trim()] = value;
  });
  return cookies;
}

export const playVideoAd = () => {
  return new Promise<void>((resolve, reject) => {
  if((window as any)?.adProvider === 'gamemonetize' && Date.now() - (window as any)?.lastVidAdTime > (window as any)?.vidAdDelay && typeof (window as any).sdk !== 'undefined' && (window as any).sdk.showBanner !== 'undefined') {
    console.log('Playing video ad');
    const sdk = (window as any).sdk;
    sdk?.showBanner();
    const onComplete = () => {
      console.log('Ad complete');
      resolve();
      window.removeEventListener('gamemonetize_event_SDK_BANNER_COMPLETE', onComplete);
    };
    // const onImpression = () => {

    //   window.removeEventListener('gamemonetize_event_SDK_BANNER_IMPRESSION', onImpression);
    // };

    (window as any).lastVidAdTime = Date.now();
    window.localStorage.setItem('lastVidAdTime', (window as any).lastVidAdTime);
    
    // window.addEventListener('gamemonetize_event_SDK_BANNER_IMPRESSION', onImpression);
    window.addEventListener('gamemonetize_event_SDK_GAME_START', (e: any) => {
      onComplete();
    });
  } else {
    resolve();
  }
});
}
