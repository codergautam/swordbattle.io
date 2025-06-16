import { config } from "src/config";
import * as filter from 'leo-profanity';

export default function validateClantag(clantag: string): string {
  // just to be safe
  if(clantag === "__proto__" || clantag === "constructor" || clantag === "prototype" || clantag === "DEV" || clantag === "ADMIN" || clantag === "OWNER" || clantag === "CODER") {
    return "Clan is not allowed";
  }
  // normal validation
  if(clantag.length < config.clanLength[0] || clantag.length > config.clanLength[1]) {
    return `Clan must be between ${config.clanLength[0]} and ${config.clanLength[1]} characters`;
  }
  const regex = /^[a-zA-Z0-9]+$/;
  if (!regex.test(clantag)) {
    return "Clan name can only contain letters and numbers";
  }
  var containsProfanity = filter.check(clantag);
  if(containsProfanity) {
    return "Clan contains a bad word!\nIf this is a mistake, please contact an admin.";
  }
  return "";
}
