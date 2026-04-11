import { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AccountState } from '../../../../redux/account/slice';
import { createClan } from '../../../../redux/clans/slice';
import { numberWithCommas } from '../../../../helpers';
import ClanEmblem from '../ClanEmblem';
import XpGateOverlay from '../XpGateOverlay';
import {
  allowedFrameIds, allowedIconIds, allowedFrameColors, allowedIconColors,
  allowedXpRequirements, allowedMasteryRequirements,
  clanDescriptionMax, clanXpRequirement, clanCreationCost,
  ClanStatus, statusLabels, grayscaleIconIds,
} from '../constants';

interface CreateClanTabProps {
  account: AccountState;
}

function localSimilarityCheck(tag: string, name: string): string {
  if (!tag || !name) return '';
  const t = tag.toLowerCase();
  const n = name.toLowerCase().replace(/\s+/g, '');
  if (n.length === 0) return '';
  const firstIsDigit = /[0-9]/.test(t[0]);
  if (firstIsDigit) {
    if (!n.includes(t[0])) return 'Tag and name must start with the same character';
  } else if (t[0] !== n[0]) {
    return 'Tag and name must start with the same character';
  }
  let wildcards = 0;
  for (let i = 1; i < t.length; i++) {
    if (!n.includes(t[i])) {
      wildcards++;
      if (wildcards > 1) return 'Tag and name are too different from each other';
    }
  }
  return '';
}

export default function CreateClanTab({ account }: CreateClanTabProps) {
  const dispatch = useDispatch();
  const eligible = (account.xp ?? 0) >= clanXpRequirement;
  const canAfford = (account.gems ?? 0) >= clanCreationCost;

  const [tag, setTag] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frameId, setFrameId] = useState<number>(allowedFrameIds[0]);
  const [iconId, setIconId] = useState<number>(allowedIconIds[0]);
  const [frameColor, setFrameColor] = useState<string>(allowedFrameColors[0]);
  const [iconColor, setIconColor] = useState<string>(allowedIconColors[0]);
  const [status, setStatus] = useState<ClanStatus>(ClanStatus.Public);
  const [xpRequirement, setXpRequirement] = useState(0);
  const [masteryRequirement, setMasteryRequirement] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = useMemo(() => {
    const e: { tag?: string; name?: string; description?: string } = {};
    if (!tag) e.tag = 'Required';
    else if (tag.length > 4) e.tag = 'Max 4 characters';
    else if (!/^[A-Za-z0-9]+$/.test(tag)) e.tag = 'Letters and numbers only';

    if (!name) e.name = 'Required';
    else if (name.length > 25) e.name = 'Max 25 characters';
    else if (!/^[A-Za-z0-9 ]+$/.test(name)) e.name = 'Use letters, numbers, and spaces only';
    else if (/ {2,}/.test(name)) e.name = 'No double spaces';
    else if (name !== name.trim()) e.name = 'Clan name cannot start or end with spaces';

    if (!e.tag && !e.name) {
      const sim = localSimilarityCheck(tag, name);
      if (sim) e.tag = sim;
    }

    if (description.length > clanDescriptionMax) e.description = `Max ${clanDescriptionMax} characters`;
    return e;
  }, [tag, name, description]);

  const canSubmit = eligible && canAfford && !errors.tag && !errors.name && !errors.description && tag && name && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const res: any = await dispatch(createClan({
        tag, name, description, frameId, iconId, frameColor, iconColor,
        status, xpRequirement, masteryRequirement,
      }) as any);
      if (res?.message || res?.error) {
        setServerError(res?.message ?? res?.error);
      }
    } catch (e: any) {
      setServerError(e?.message ?? 'Failed to create clan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {!eligible && <XpGateOverlay currentXp={account.xp ?? 0} />}
      <div className="clans-form">
        <div className="clans-form__left">
          <div className="clans-form__field">
            <label>Clan Tag (1–4 characters)</label>
            <input value={tag} maxLength={4} onChange={(e) => setTag(e.target.value.toUpperCase())} placeholder="CLAN" />
            {errors.tag && <span className="err">{errors.tag}</span>}
          </div>

          <div className="clans-form__field">
            <label>Clan Name (1–25 characters)</label>
            <input value={name} maxLength={25} onChange={(e) => setName(e.target.value)} placeholder="Enter Clan Name" />
            {errors.name && <span className="err">{errors.name}</span>}
          </div>

          <div className="clans-form__field">
            <label>Description (optional)</label>
            <textarea value={description} maxLength={clanDescriptionMax} onChange={(e) => setDescription(e.target.value)} />
            <span className="hint">{description.length} / {clanDescriptionMax}</span>
            {errors.description && <span className="err">{errors.description}</span>}
          </div>

          <div className="clans-form__field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(Number(e.target.value))}>
              <option value={ClanStatus.Public}>{statusLabels[ClanStatus.Public]} (anyone can join)</option>
              <option value={ClanStatus.Request}>{statusLabels[ClanStatus.Request]} (require approval)</option>
              <option value={ClanStatus.Private}>{statusLabels[ClanStatus.Private]} (no joining)</option>
            </select>
          </div>

          <div className="clans-form__row-2">
            <div className="clans-form__field">
              <label>XP Requirement</label>
              <select value={xpRequirement} onChange={(e) => setXpRequirement(Number(e.target.value))}>
                {allowedXpRequirements.map((v) => (
                  <option key={v} value={v}>{v === 0 ? 'None' : numberWithCommas(v)}</option>
                ))}
              </select>
            </div>

            <div className="clans-form__field">
              <label>Mastery Requirement</label>
              <select value={masteryRequirement} onChange={(e) => setMasteryRequirement(Number(e.target.value))}>
                {allowedMasteryRequirements.map((v) => (
                  <option key={v} value={v}>{v === 0 ? 'None' : numberWithCommas(v)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="clans-form__submit-row">
            {serverError && <span className="err">{serverError}</span>}
            <span className={canAfford ? 'cost' : 'cost cost--unaffordable'}>
              Cost: {numberWithCommas(clanCreationCost)} gems
              {!canAfford && ` (you have ${numberWithCommas(account.gems ?? 0)})`}
            </span>
            <button disabled={!canSubmit} onClick={onSubmit}>
              {submitting ? 'Creating...' : 'Create Clan'}
            </button>
          </div>
        </div>

        <div className="clans-form__pickers">
          <div className="clans-form__preview">
            <ClanEmblem frameId={frameId} iconId={iconId} frameColor={frameColor} iconColor={iconColor} size={140} />
            <div className="preview-name">
              {tag ? <span className="preview-tag">[{tag}]</span> : ''} {name || 'Your Clan'}
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold' }}>Frame</label>
            <div className="picker-row">
              {allowedFrameIds.map((id) => (
                <div
                  key={id}
                  className={`picker-item ${frameId === id ? 'active' : ''}`}
                  onClick={() => setFrameId(id)}
                >
                  <ClanEmblem frameId={id} iconId={iconId} frameColor={frameColor} iconColor={iconColor} size={60} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold' }}>Icon</label>
            <div className="picker-row">
              {allowedIconIds.map((id) => (
                <div
                  key={id}
                  className={`picker-item ${iconId === id ? 'active' : ''}`}
                  onClick={() => setIconId(id)}
                >
                  <ClanEmblem frameId={frameId} iconId={id} frameColor={frameColor} iconColor={iconColor} size={50} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold' }}>Frame Color</label>
            <div className="picker-row">
              {allowedFrameColors.map((c) => (
                <div
                  key={c}
                  className={`color-swatch ${frameColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setFrameColor(c)}
                />
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold' }}>Icon Color</label>
            <div className="picker-row">
              {allowedIconColors.map((c) => (
                <div
                  key={c}
                  className={`color-swatch ${iconColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setIconColor(c)}
                />
              ))}
            </div>
            {grayscaleIconIds.has(iconId) && (
              <span className="hint">This icon is grayscale and won't change color.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
