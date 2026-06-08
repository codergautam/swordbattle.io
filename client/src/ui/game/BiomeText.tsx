import { useEffect, useState } from 'react';
import './BiomeText.scss';

const BIOME_INFO: Record<string, { name: string; desc: string; hidden?: boolean }> = {
  Safezone: {
    name: "The Safezone",
    desc: "The spawn area"
  },
  Fire: {
    name: "The Scorch",
    desc: "Dangerous burning terrain"
  },
  Earth: {
    name: "The Forest",
    desc: "Calm lands covered in trees"
  },
  Ice: {
    name: "The Arctic",
    desc: "Slippery ground with snow piles"
  },
};

interface Props {
  biome: string | null;
}

export default function BiomeText({ biome }: Props) {
  const [visible, setVisible] = useState(false);
  const [currentBiome, setCurrentBiome] = useState<string | null>(null);

  useEffect(() => {
    if (!biome || !BIOME_INFO[biome] || BIOME_INFO[biome].hidden) {
      setVisible(false);
      return;
    }

    setCurrentBiome(biome);

    setVisible(true);

    const t = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(t);
  }, [biome]);

  if (!currentBiome || !BIOME_INFO[currentBiome]) return null;

  const { name, desc } = BIOME_INFO[currentBiome];

  return (
    <div id="biomeText" className={visible ? 'show' : ''}>
      <div className="biomeName">{name}</div>
      <div className="biomeDesc">{desc}</div>
    </div>
  );
}
