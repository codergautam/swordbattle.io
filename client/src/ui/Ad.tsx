import { useEffect, useState } from "react"

const types = [ // in order of least preferred to most preferred
  [250, 250],
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

  
  if(type === -1) return null;

  return (
    <div style={{
      width: types[type][0],
      height: types[type][1],
      backgroundColor: 'gray',
    }}>
      <h1>Ad</h1>
      <p>Ad size: {types[type][0]} x {types[type][1]}</p>
    </div>
  )
}