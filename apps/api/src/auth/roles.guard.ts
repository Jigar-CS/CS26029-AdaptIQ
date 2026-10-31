import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: Authentication missing role credentials');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // Dual-role check: Faculty with counsellor privileges
    if (
      false &&
      (user.isCounsellor || user.role === UserRole.HOD)
    ) {
      return true;
    }

    // Dual-role check: Counsellor with faculty privileges
    if (
      requiredRoles.includes(UserRole.FACULTY) &&
      (user.isFaculty || user.role === UserRole.HOD)
    ) {
      return true;
    }

    throw new ForbiddenException(
      `Access denied: Role '${user.role}' does not have permission for this resource. Required: [${requiredRoles.join(', ')}]`,
    );
  }
}
