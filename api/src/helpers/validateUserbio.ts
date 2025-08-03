import { config } from "src/config";
import * as filter from 'leo-profanity';

export default function validateUserbio(bio: string): string {
  // just to be safe
  if(bio === "__proto__" || bio === "constructor" || bio === "prototype") {
    return "Bio is not allowed";
  }
  // normal validation
  if(bio.length < config.bioLength[0] || bio.length > config.bioLength[1]) {
    return `Bio must be between ${config.bioLength[0]} and ${config.bioLength[1]} characters`;
  }
  if(bio.charAt(0) == " " || bio.charAt(bio.length - 1) == " ") {
    return "Bio can't start or end with a space";
  }
  if(bio.includes("  ")) {
    return "Bio can't have two spaces in a row";
  }
  var regex = /^[a-zA-Z0-9!@"$%&:';()*\+,;\-=[\]\^_{|}<>~` ]+$/g;
  if(!bio.match(regex)) {
    return "Bio can only contain letters, numbers, spaces, and the following symbols: !@\"$%&:';()*\+,-=[\]\^_{|}<>~`";
  }
  var containsProfanity = filter.check(bio);
  if(containsProfanity) {
    return "Bio contains a bad word!\nIf this is a mistake, please contact an admin.";
  }
  return "";
}
