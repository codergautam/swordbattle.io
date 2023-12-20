import { config } from "src/config";
import * as filter from 'leo-profanity';

export default function validateUsername(username: string): string {
  // just to be safe
  if(username === "__proto__" || username === "constructor" || username === "prototype") {
    return "Username is not allowed";
  }
  // normal validation
  if(username.length < config.usernameLength[0] || username.length > config.usernameLength[1]) {
    return `Username must be between ${config.usernameLength[0]} and ${config.usernameLength[1]} characters`;
  }
  if(username.charAt(0) == " " || username.charAt(username.length - 1) == " ") {
    return "Username can't start or end with a space";
  }
  if(username.includes("  ")) {
    return "Username can't have two spaces in a row";
  }
  var regex = /^[a-zA-Z0-9!@"$%&:';()*\+,;\-=[\]\^_{|}<>~` ]+$/g;
  if(!username.match(regex)) {
    return "Username can only contain letters, numbers, spaces, and the following symbols: !@\"$%&:';()*\+,-=[\]\^_{|}<>~`";
  }
  var containsProfanity = filter.check(username);
  if(containsProfanity) {
    return "Username contains a bad word!\nIf this is a mistake, please contact an admin.";
  }
  return "";
}