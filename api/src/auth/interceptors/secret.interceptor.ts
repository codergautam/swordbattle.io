import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class SecretInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap((data) => {
        const user_secret: string | undefined = request.body.secret;
        let secrets = this.recurseSecretSearch(data);
        if (user_secret) {
          for (const secret of secrets) {
            if (secret !== user_secret) {
              throw new ForbiddenException("Non user secret sent to client");
            }
          }
        } else {
          if (secrets.length > 0) {
            throw new ForbiddenException("Secrets sent unauthorized to client");
          }
        }
      }),
    );
  }

  /// recursively search for any secrets and return if found
  private recurseSecretSearch(data: object): string[] {
    const secrets: string[] = [];
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "object") {
        secrets.push(...this.recurseSecretSearch(data[key]));
      } else if (typeof data[key] === "string" && key === "secret") {
        secrets.push(data[key]);
      }
    });
    return secrets;
  }
}
