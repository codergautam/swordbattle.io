import Coin from "./game/entities/Coin";
import Player from "./game/entities/Player";

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

export function findCoinCollector(coin: Coin, players: Player[]) {
    const errorThreshold = 1.1;
    const coinRadius = coin.shape.radius * coin.container.scale * errorThreshold;
    const coinX = coin.shape.x;
    const coinY = coin.shape.y;

    let entity = null;
    players.forEach((player: Player) => {
      const playerRadius = player.shape.radius * 2 * errorThreshold;
      if (playerRadius > coinRadius) {
        const distance = Math.sqrt(Math.pow(player.shape.x - coinX, 2) + Math.pow(player.shape.y - coinY, 2));
        if (distance < playerRadius) {
          entity = player;
        }
      }
    });
    return entity;
}


export const playVideoAd = () => {
  const windowAny = window as any;
  return new Promise<void>((resolve, reject) => {
    // checking if playing ad less than 2 minutes ago, gamemonetize exists and loaded
  if(Date.now() - windowAny?.lastVidAdTime > windowAny?.vidAdDelay) {
    if(windowAny?.adProvider === 'gamemonetize' && typeof windowAny.sdk !== 'undefined' && windowAny.sdk.showBanner !== 'undefined') {
    console.log('Playing video ad from gamemonetize');
    const sdk = windowAny.sdk;
    sdk?.showBanner();
    const onComplete = () => {
      console.log('Ad complete');
      resolve();
      window.removeEventListener('gamemonetize_event_SDK_BANNER_COMPLETE', onComplete);
    };
    // const onImpression = () => {

    //   window.removeEventListener('gamemonetize_event_SDK_BANNER_IMPRESSION', onImpression);
    // };

    windowAny.lastVidAdTime = Date.now();
    window.localStorage.setItem('lastVidAdTime', windowAny.lastVidAdTime);

    // window.addEventListener('gamemonetize_event_SDK_BANNER_IMPRESSION', onImpression);
    window.addEventListener('gamemonetize_event_SDK_GAME_START', (e: any) => {
      onComplete();
    });
    // adinplay
  } else if(windowAny?.adProvider === 'adinplay' && typeof windowAny?.aiptag?.adplayer !== 'undefined') {
    console.log('Playing video ad from adinplay');

    /* if (typeof aiptag.adplayer !== "undefined") {
            this.nameBox.getChildByName("btn").innerHTML = "Connecting..";
            this.nameBox.getChildByName("btn").style.backgroundColor = "grey";
            this.music.stop();

            aiptag.cmd.player.push(() => {
              aiptag.adplayer = new aipPlayer({
                AD_WIDTH: 960,
                AD_HEIGHT: 540,
                AD_FULLSCREEN: true,
                AD_CENTERPLAYER: false,
                LOADING_TEXT: "loading advertisement",
                PREROLL_ELEM: function() { return document.getElementById("preroll"); },
                AIP_COMPLETE: (evt) => {
                  // ******************
                  //  ***** WARNING *****
                  //  *******************
                  //  Please do not remove the PREROLL_ELEM
                  //  from the page, it will be hidden automaticly.
                  //  If you do want to remove it use the AIP_REMOVE callback.

                   console.log("preroll complete", evt);
                   this.nameBox.destroy();
                   document.getElementById("game").focus();
                   let failed= false;
                   try {
                     const urlParams = new URLSearchParams(window.location.search);
                     const ad = urlParams.get('debugAd');
                     if(ad) {
                       alert(evt+ " ad completed");
                     }
                   } catch (e) {
                     console.log("failed to get url params");
                   }
                   if(evt == "video-ad-empty" || evt == "user-has-adblock") failed = true;
                   // if(evt == "user-has-adblock") alert("Hi, we noticed you are using adblock on swordbattle.io.\n\n As a heavy adblock user myself, I understand the frustration of ads.\n However, as a free game we rely on ads for servers and development cost.\n If you would like to support us, please consider disabling adblock on swordbattle.io to remove this message.\n Thanks!\n- Gautam, lead dev @ swordbattle.io");
                   this.callback(myName, this.music, this.secret, failed);
 document.getElementById("90pxadstyle").innerHTML = `
 #swordbattle-io_970x90 > div > iframe,
 #swordbattle-io_970x90 > iframe {
 bottom: 0px;
     left: 50%;
 transform: translateX(-50%);
 }`;
                   document.getElementById("swordbattle-io_970x250").style.display = "none";
                   document.getElementById("swordbattle-io_970x90").style.display = "none";

                   this.lastAdRef = Number.MAX_SAFE_INTEGER;

                   console.log("Preroll Ad Completed: " + evt);
                 }
               });
             });
             aiptag.cmd.player.push(() => {
               console.log("starting preroll");
               aiptag.adplayer.startPreRoll();
             });
           }
           */

    windowAny.aiptag.cmd.player.push(() => {
      windowAny.aiptag.adplayer = new windowAny.aipPlayer({
        AD_WIDTH: 960,
        AD_HEIGHT: 540,
        AD_FULLSCREEN: true,
        AD_CENTERPLAYER: false,
        LOADING_TEXT: "loading advertisement",
        PREROLL_ELEM: function() { return document.getElementById("preroll"); },
        AIP_COMPLETE: (evt: any) => {
          console.log("preroll complete", evt);
          resolve();
        }
      });
    }
    );
    windowAny.aiptag.cmd.player.push(() => {
      console.log("starting preroll");
      windowAny.aiptag.adplayer.startPreRoll();
    });


    // if debugAd = true, dont reset lastVidAdTime
    const urlParams = new URLSearchParams(window.location.search);
    const ad = urlParams.get('debugAd');
    if(ad) {
      console.log('debugAd=true, not resetting lastVidAdTime');
    } else {
      windowAny.lastVidAdTime = Date.now();
      window.localStorage.setItem('lastVidAdTime', windowAny.lastVidAdTime);
    }
  } else if(windowAny?.adProvider === 'gamepix' && windowAny?.GamePix) {
    windowAny?.GamePix.interstitialAd().then(function (res: any) {
      console.log('Ad closed', res);
      resolve();
    });
  } else {
    console.log('Adprovider is', windowAny?.adProvider, 'not playing video ad');
    resolve();
  }
} else {
  console.log('Not playing video ad, last ad was', ((Date.now() - windowAny?.lastVidAdTime)/1000).toFixed(2), 's ago');
  resolve();
}
});
}