import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../redux/store';
import { editClan, fetchClanProfile } from '../../../../redux/clans/slice';
import { numberWithCommas } from '../../../../helpers';
import ClanEmblem from '../ClanEmblem';
import {
  allowedFrameIds, allowedIconIds, allowedFrameColors, allowedIconColors,
  allowedXpRequirements, allowedMasteryRequirements,
  clanDescriptionMax, ClanRole, ClanStatus, statusLabels, grayscaleIconIds,
} from '../constants';

export default function EditClanTab() {
  const dispatch = useDispatch();
  const myClan = useSelector((s: RootState) => s.account.clan);
  const profile = useSelector((s: RootState) => myClan?.clan?.id ? s.clans.profileCache[myClan.clan.id] : null);
  const clanId = myClan?.clan?.id ?? null;
  const role = (myClan?.role ?? ClanRole.Member) as ClanRole;
  const canEdit = role <= ClanRole.CoLeader;

  const [description, setDescription] = useState('');
  const [frameId, setFrameId] = useState<number>(allowedFrameIds[0]);
  const [iconId, setIconId] = useState<number>(allowedIconIds[0]);
  const [frameColor, setFrameColor] = useState<string>(allowedFrameColors[0]);
  const [iconColor, setIconColor] = useState<string>(allowedIconColors[0]);
  const [status, setStatus] = useState<ClanStatus>(ClanStatus.Public);
  const [xpRequirement, setXpRequirement] = useState(0);
  const [masteryRequirement, setMasteryRequirement] = useState(0);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (clanId && !profile) dispatch(fetchClanProfile(clanId) as any);
  }, [dispatch, clanId, profile]);

  useEffect(() => {
    if (profile) {
      setDescription(profile.description ?? '');
      setFrameId(profile.frameId);
      setIconId(profile.iconId);
      setFrameColor(profile.frameColor);
      setIconColor(profile.iconColor ?? allowedIconColors[0]);
      setStatus(profile.status as ClanStatus);
      setXpRequirement(profile.xpRequirement);
      setMasteryRequirement(profile.masteryRequirement);
    }
  }, [profile]);

  if (!clanId) return <p>You are not in a clan.</p>;
  if (!profile) return <p style={{ color: '#aaa' }}>Loading...</p>;

  const onSave = async () => {
    setSaving(true);
    setServerError(null);
    try {
      const res: any = await dispatch(editClan(clanId, {
        description, frameId, iconId, frameColor, iconColor, status, xpRequirement, masteryRequirement,
      }) as any);
      if (res?.message || res?.error) setServerError(res?.message ?? res?.error);
    } catch (e: any) {
      setServerError(e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {!canEdit && (
        <div className="clans-xp-gate">
          <div className="clans-xp-gate__inner">
            <h2>You must be co-leader or leader to edit</h2>
          </div>
        </div>
      )}

      <div className="clans-form">
        <div>
          <div className="clans-form__field">
            <label>Tag (cannot be changed)</label>
            <input value={profile.tag} disabled />
          </div>
          <div className="clans-form__field">
            <label>Name (cannot be changed)</label>
            <input value={profile.name} disabled />
          </div>
          <div className="clans-form__field">
            <label>Description</label>
            <textarea value={description} maxLength={clanDescriptionMax} onChange={(e) => setDescription(e.target.value)} />
            <span className="hint">{description.length} / {clanDescriptionMax}</span>
          </div>
          <div className="clans-form__field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(Number(e.target.value))}>
              <option value={ClanStatus.Public}>{statusLabels[ClanStatus.Public]}</option>
              <option value={ClanStatus.Request}>{statusLabels[ClanStatus.Request]}</option>
              <option value={ClanStatus.Private}>{statusLabels[ClanStatus.Private]}</option>
            </select>
          </div>
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

        <div className="clans-form__pickers">
          <div className="clans-form__preview">
            <ClanEmblem frameId={frameId} iconId={iconId} frameColor={frameColor} iconColor={iconColor} size={140} />
            <div className="preview-name"><span className="preview-tag">[{profile.tag}]</span> {profile.name}</div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold' }}>Frame</label>
            <div className="picker-row">
              {allowedFrameIds.map((id) => (
                <div key={id} className={`picker-item ${frameId === id ? 'active' : ''}`} onClick={() => setFrameId(id)}>
                  <ClanEmblem frameId={id} iconId={iconId} frameColor={frameColor} iconColor={iconColor} size={60} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold' }}>Icon</label>
            <div className="picker-row">
              {allowedIconIds.map((id) => (
                <div key={id} className={`picker-item ${iconId === id ? 'active' : ''}`} onClick={() => setIconId(id)}>
                  <ClanEmblem frameId={frameId} iconId={id} frameColor={frameColor} iconColor={iconColor} size={50} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold' }}>Frame Color</label>
            <div className="picker-row">
              {allowedFrameColors.map((c) => (
                <div key={c} className={`color-swatch ${frameColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setFrameColor(c)} />
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold' }}>Icon Color</label>
            <div className="picker-row">
              {allowedIconColors.map((c) => (
                <div key={c} className={`color-swatch ${iconColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setIconColor(c)} />
              ))}
            </div>
            {grayscaleIconIds.has(iconId) && (
              <span className="hint">This icon is grayscale and won't change color.</span>
            )}
          </div>
        </div>

        <div className="clans-form__submit">
          {serverError && <span style={{ color: '#ff6666', alignSelf: 'center' }}>{serverError}</span>}
          <button disabled={saving || !canEdit} onClick={onSave}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}
