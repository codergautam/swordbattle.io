import { config } from "src/config";
import * as filter from 'leo-profanity';

export default function validateClan(clan: string): string {
  // just to be safe
  if(clan === "__proto__" || clan === "constructor" || clan === "prototype") {
    return "Clan is not allowed";
  }
  // normal validation
  if(clan.length < config.clanLength[0] || clan.length > config.clanLength[1]) {
    return `Clan must be between ${config.clanLength[0]} and ${config.clanLength[1]} characters`;
  }
  const regex = /^[a-zA-Z0-9]+$/;
  if (!regex.test(clan)) {
    return "Clan name can only contain letters and numbers";
  }
  var containsProfanity = filter.check(clan);
  if(containsProfanity) {
    return "Clan contains a bad word!\nIf this is a mistake, please contact an admin.";
  }
  return "";
}