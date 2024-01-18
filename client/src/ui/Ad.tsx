import { useEffect, useState } from "react"

const types = [ // in order of least preferred to most preferred
  [300, 250],
  [970, 90],
  [970, 250],
]

function findAdType(screenW: number, screenH: number) {
  let type = 0;
  for (let i = 0; i < types.length; i++) {
    console.log(types[i][0], types[i][1], screenW, screenH);
    if (types[i][0] <= screenW*0.9 && types[i][1] <= screenH * 0.3) {
      type = i;
    }
  }

  if(types[type][0] > screenW || types[type][1] > screenH*0.5) return -1;

  return type;
}

export default function Ad({ screenW, screenH }: { screenW: number, screenH: number }) {
  // just a div for now with optimal ad size, null if none are good
  const [type, setType] = useState(findAdType(screenW, screenH));

  useEffect(() => {
    setType(findAdType(screenW, screenH));
  }, [screenW, screenH]);

  useEffect(() => {
    // aiptag.cmd.display.push(function() { aipDisplayTag.display("swordbattle-io_970x90"); });
    const windowAny = window as any;
    if(windowAny.aiptag && windowAny.aiptag.cmd && windowAny.aiptag.cmd.display) {
      console.log('ad type', type);
      windowAny.aiptag.cmd.display.push(function() { windowAny.aipDisplayTag.display(`swordbattle-io_${types[type][0]}x${types[type][1]}`); });
    } else {
      console.log('no ad');
    }
  }, [type]);


  if(type === -1) return null;

  return (
    <div style={{
      width: types[type][0],
      height: types[type][1],
      backgroundColor: 'gray',
    }} id={`swordbattle-io_${types[type][0]}x${types[type][1]}`}>
      {/* <h1>Ad</h1>
      <p>Ad size: {types[type][0]} x {types[type][1]}</p> */}
    </div>
  )
}