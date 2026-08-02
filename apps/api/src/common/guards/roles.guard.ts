import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { ROLES_KEY } from "../decorators/roles.decorator"

const ROLE_ORDER = ["USER", "PREMIUM", "MODERATOR", "ADMIN", "SUPER_ADMIN"]

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user?.role) return false

    const userRank = ROLE_ORDER.indexOf(user.role)
    // A role satisfies the requirement if it is at or above the lowest required role.
    const minRequired = Math.min(...required.map((r) => ROLE_ORDER.indexOf(r)))
    return userRank >= minRequired
  }
}
