import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccountState } from '../../../../redux/account/slice';
import { RootState } from '../../../../redux/store';
import { fetchClanProfile } from '../../../../redux/clans/slice';
import ClanProfile from '../ClanProfile';

interface YourClanTabProps {
  account: AccountState;
  onOpenUserProfile: (username: string) => void;
  setLoadingLabel: (label: string | null) => void;
}

export default function YourClanTab({ account, onOpenUserProfile, setLoadingLabel }: YourClanTabProps) {
  const dispatch = useDispatch();
  const myClan = useSelector((s: RootState) => s.account.clan);

  useEffect(() => {
    if (myClan?.clan?.id) dispatch(fetchClanProfile(myClan.clan.id) as any);
  }, [dispatch, myClan?.clan?.id]);

  if (!myClan) return <p>You are not in a clan.</p>;
  return (
    <ClanProfile
      clanId={myClan.clan.id}
      viewerInClan={true}
      account={account}
      onOpenUserProfile={onOpenUserProfile}
      setLoadingLabel={setLoadingLabel}
    />
  );
}
